import { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import VRViewer from './VRViewer';

export default function Receiver({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      peerConnectionRef.current?.close();
    };
  }, []);

  const handleConnect = () => {
    if (code.length !== 4) return;
    
    setStatus('connecting');
    setErrorMsg('');

    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', code);
    });

    socket.on('room-not-found', () => {
      setStatus('error');
      setErrorMsg('Invalid code or room not found.');
      socket.disconnect();
    });

    socket.on('offer', async (payload) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          handleDisconnect('error');
          setErrorMsg('Connection lost.');
        }
      };

      pc.ontrack = (event) => {
        if (event.receiver) {
          // Attempt to reduce buffering latency
          // @ts-ignore
          event.receiver.playoutDelayHint = 0;
        }

        if (event.streams && event.streams[0]) {
          const receivedStream = event.streams[0];
          setStream(receivedStream);
          setStatus('connected');

          receivedStream.getVideoTracks()[0].onended = () => {
            handleDisconnect('error');
            setErrorMsg('The sender stopped sharing the screen.');
          };
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            target: payload.sender,
            candidate: event.candidate
          });
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          target: payload.sender,
          sdp: pc.localDescription
        });
      } catch (err) {
        console.error('Error handling offer:', err);
        setStatus('error');
        setErrorMsg('Failed to establish connection.');
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
  };

  const handleDisconnect = (newStatus: 'idle' | 'error' = 'idle') => {
    socketRef.current?.disconnect();
    peerConnectionRef.current?.close();
    socketRef.current = null;
    peerConnectionRef.current = null;
    setStream(null);
    setStatus(newStatus);
  };

  if (status === 'connected' && stream) {
    return <VRViewer stream={stream} onDisconnect={handleDisconnect} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans flex flex-col">
      <header className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold ml-4">Connect to PC</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4">
            <Smartphone size={48} />
          </div>
          <h2 className="text-3xl font-bold">Enter Code</h2>
          <p className="text-zinc-400">Type the 4-digit code shown on your PC screen.</p>
        </div>

        <div className="w-full space-y-6">
          <input
            type="text"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center text-5xl font-mono font-bold tracking-widest bg-zinc-900 border-2 border-zinc-800 rounded-2xl py-6 focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder="----"
            disabled={status === 'connecting'}
          />

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <AlertCircle size={20} />
              <p>{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={code.length !== 4 || status === 'connecting'}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Connecting...
              </>
            ) : (
              'Connect & View in VR'
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
