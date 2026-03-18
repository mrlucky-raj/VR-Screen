import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, MonitorPlay, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Sender({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'connected'>('idle');
  const [error, setError] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      streamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

  const handleStartSharing = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        setStatus('idle');
        socketRef.current?.disconnect();
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
      };

      // Generate a random 4-digit room code
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomId(code);

      const socket = io();
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('create-room', code);
        setStatus('waiting');
      });

      socket.on('user-joined', async (userId) => {
        setStatus('connected');
        await connectToPeer(userId);
      });

      socket.on('answer', async (payload) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } catch (e) {
            console.error('Error setting remote description:', e);
          }
        }
      });

      socket.on('ice-candidate', async (payload) => {
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error('Error adding ice candidate:', e);
          }
        }
      });

    } catch (err: any) {
      console.error('Error sharing screen:', err);
      setError('Failed to share screen. Please grant permission.');
      setStatus('idle');
    }
  };

  const connectToPeer = async (targetUserId: string) => {
    if (!streamRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionRef.current = pc;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setStatus('waiting');
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
      }
    };

    streamRef.current.getTracks().forEach(track => {
      if (track.kind === 'video') {
        // Hint to the browser that we want smooth motion (latency/framerate) over resolution
        track.contentHint = 'motion';
      }
      
      const sender = pc.addTrack(track, streamRef.current!);
      
      // Attempt to set degradation preference to maintain-framerate
      try {
        const params = sender.getParameters();
        if (params) {
          params.degradationPreference = 'maintain-framerate';
          sender.setParameters(params).catch((e) => console.log('setParameters error:', e));
        }
      } catch (e) {
        console.log('Could not set degradationPreference:', e);
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: targetUserId,
          candidate: event.candidate
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current?.emit('offer', {
      target: targetUserId,
      sdp: pc.localDescription
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans flex flex-col">
      <header className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold ml-4">Share Screen</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-8">
        {status === 'idle' && (
          <div className="text-center space-y-6">
            <div className="inline-flex p-6 rounded-3xl bg-indigo-500/10 text-indigo-400 mb-2">
              <MonitorPlay size={64} />
            </div>
            <h2 className="text-3xl font-bold">Ready to Share</h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Click the button below to select the screen or window you want to share to your VR headset.
            </p>
            
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleStartSharing}
              className="w-full max-w-xs flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-xl transition-colors mx-auto"
            >
              Start Sharing
            </button>
          </div>
        )}

        {status === 'waiting' && (
          <div className="text-center space-y-6">
            <div className="inline-block p-8 rounded-3xl bg-zinc-900 border border-zinc-800">
              <p className="text-zinc-400 mb-2 uppercase tracking-widest text-sm font-semibold">Connection Code</p>
              <h2 className="text-6xl font-mono font-bold tracking-widest text-indigo-400">
                {roomId}
              </h2>
            </div>
            
            <div className="flex items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="animate-spin" size={20} />
              <p>Waiting for smartphone to connect...</p>
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
            <h2 className="text-2xl font-bold">Device Connected!</h2>
            <p className="text-zinc-400">Your screen is now being streamed to your smartphone.</p>
          </div>
        )}

        <div className={`w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 aspect-video relative ${(status === 'waiting' || status === 'connected') ? 'block' : 'hidden'}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-contain"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium">Sharing Screen</span>
          </div>
        </div>
      </main>
    </div>
  );
}
