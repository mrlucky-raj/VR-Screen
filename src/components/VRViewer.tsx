import { useState, useRef, useEffect } from 'react';
import { Settings, X, Maximize, Minimize, ArrowLeftRight, ArrowUpDown } from 'lucide-react';

interface VRViewerProps {
  stream: MediaStream;
  onDisconnect: () => void;
}

export default function VRViewer({ stream, onDisconnect }: VRViewerProps) {
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [ipd, setIpd] = useState(0); // Horizontal offset
  const [vOffset, setVOffset] = useState(0); // Vertical offset

  useEffect(() => {
    if (leftVideoRef.current && rightVideoRef.current) {
      leftVideoRef.current.srcObject = stream;
      rightVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Request fullscreen on mount
  useEffect(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.log(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
    
    // Lock orientation to landscape if possible
    if (screen.orientation && (screen.orientation as any).lock) {
      (screen.orientation as any).lock('landscape').catch((err: any) => {
        console.log(`Error locking orientation: ${err.message}`);
      });
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
  }, []);

  const videoStyle = {
    transform: `scale(${scale}) translate(${ipd}px, ${vOffset}px)`,
    transition: 'transform 0.1s ease-out'
  };

  const rightVideoStyle = {
    transform: `scale(${scale}) translate(${-ipd}px, ${vOffset}px)`,
    transition: 'transform 0.1s ease-out'
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex" onClick={() => setShowSettings(!showSettings)}>
      
      {/* Left Eye */}
      <div className="w-1/2 h-full relative overflow-hidden border-r border-zinc-900 flex items-center justify-center">
        <video
          ref={leftVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain pointer-events-none"
          style={videoStyle}
        />
      </div>

      {/* Right Eye */}
      <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center">
        <video
          ref={rightVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain pointer-events-none"
          style={rightVideoStyle}
        />
      </div>

      {/* Settings Overlay */}
      {showSettings && (
        <div 
          className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(false);
          }}
        >
          <div 
            className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 w-full max-w-md space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2 text-zinc-50">
                <Settings size={20} />
                <h3 className="font-semibold text-lg">VR Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Scale */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="flex items-center gap-2"><Maximize size={16} /> Screen Size</span>
                  <span>{scale.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.5" 
                  step="0.05" 
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* IPD (Horizontal) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="flex items-center gap-2"><ArrowLeftRight size={16} /> Eye Distance (IPD)</span>
                  <span>{ipd}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={ipd}
                  onChange={(e) => setIpd(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Vertical Offset */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-zinc-400">
                  <span className="flex items-center gap-2"><ArrowUpDown size={16} /> Vertical Offset</span>
                  <span>{vOffset}px</span>
                </div>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  step="1" 
                  value={vOffset}
                  onChange={(e) => setVOffset(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button 
                onClick={onDisconnect}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
