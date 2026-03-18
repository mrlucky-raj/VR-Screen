/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Sender from './components/Sender';
import Receiver from './components/Receiver';
import { MonitorUp, Smartphone } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<'home' | 'sender' | 'receiver'>('home');

  if (mode === 'sender') {
    return <Sender onBack={() => setMode('home')} />;
  }

  if (mode === 'receiver') {
    return <Receiver onBack={() => setMode('home')} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">VR Screen Share</h1>
          <p className="text-zinc-400">Stream your PC screen to your phone in VR</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => setMode('sender')}
            className="flex items-center gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <div className="p-4 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
              <MonitorUp size={32} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold">Share Screen</h2>
              <p className="text-sm text-zinc-400">From your PC or Mac</p>
            </div>
          </button>

          <button
            onClick={() => setMode('receiver')}
            className="flex items-center gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
              <Smartphone size={32} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold">View in VR</h2>
              <p className="text-sm text-zinc-400">On your smartphone</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
