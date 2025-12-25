import React from 'react';
import { AppMode } from '../types';

interface ControlsProps {
  mode: AppMode;
  onSetMode: (mode: AppMode) => void;
  isRecording: boolean;
  onRecordStart: () => void;
  onRecordStop: () => void;
  isConnected: boolean; // For Smart Mode
}

export const Controls: React.FC<ControlsProps> = ({
  mode,
  onSetMode,
  isRecording,
  onRecordStart,
  onRecordStop,
  isConnected
}) => {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md px-4">
      
      {/* Mode Switcher */}
      <div className="bg-slate-800 p-1 rounded-full flex gap-1 shadow-lg">
        <button
          onClick={() => onSetMode(AppMode.MIMIC)}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
            mode === AppMode.MIMIC 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Parrot Mode
        </button>
        <button
          onClick={() => onSetMode(AppMode.SMART)}
          className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
            mode === AppMode.SMART 
              ? 'bg-purple-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Genius Mode
        </button>
      </div>

      {/* Main Action Button */}
      {mode === AppMode.MIMIC && (
        <button
          onMouseDown={onRecordStart}
          onMouseUp={onRecordStop}
          onTouchStart={onRecordStart}
          onTouchEnd={(e) => { e.preventDefault(); onRecordStop(); }}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl transition-all active:scale-95
            ${isRecording 
              ? 'bg-red-500 border-red-300 scale-110' 
              : 'bg-white border-slate-200 hover:bg-slate-100'}
          `}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-white rounded-sm animate-pulse" />
          ) : (
             <svg className="w-8 h-8 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
             </svg>
          )}
        </button>
      )}

      {mode === AppMode.SMART && (
        <div className="text-center space-y-2">
            {!isConnected ? (
                 <button
                 onClick={onRecordStart} // Reusing recordStart to trigger connection
                 className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 mx-auto"
               >
                 <span>Start Chat</span>
               </button>
            ) : (
                <div className="flex flex-col items-center">
                    <div className="flex gap-1 h-8 items-end justify-center mb-2">
                         <div className="w-1 bg-purple-400 h-4 animate-[bounce_1s_infinite]"/>
                         <div className="w-1 bg-purple-400 h-8 animate-[bounce_1.1s_infinite]"/>
                         <div className="w-1 bg-purple-400 h-5 animate-[bounce_1.2s_infinite]"/>
                    </div>
                    <button 
                        onClick={onRecordStop}
                        className="text-slate-400 text-sm hover:text-white underline"
                    >
                        End Call
                    </button>
                </div>
            )}
           
          <p className="text-xs text-slate-400 max-w-[200px]">
            {isConnected ? "Listening... Speak naturally!" : "Tap to call Zog the Alien"}
          </p>
        </div>
      )}

      {mode === AppMode.MIMIC && (
          <p className="text-sm text-slate-400 font-medium">
              {isRecording ? "Release to Play" : "Hold to Talk"}
          </p>
      )}

    </div>
  );
};