import React, { useState, useEffect, useRef, useCallback } from 'react';
import Character from './components/Character';
import { Controls } from './components/Controls';
import { AppMode, PetEmotion, PetAppearance, DEFAULT_APPEARANCE, PetColor, PetHat, PetGlasses, PetAccessory } from './types';
import { audioEngine } from './services/audioEngine';
import { GeminiLiveSession } from './services/geminiLive';

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.MIMIC);
  const [emotion, setEmotion] = useState<PetEmotion>(PetEmotion.IDLE);
  const [talkingVolume, setTalkingVolume] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(false);
  
  // Customization State
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [appearance, setAppearance] = useState<PetAppearance>(DEFAULT_APPEARANCE);

  // Refs for animation loops and Gemini session
  const volumeIntervalRef = useRef<number | null>(null);
  const geminiSessionRef = useRef<GeminiLiveSession | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // --- Load/Save Persistence ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gemini-pet-appearance');
      if (saved) {
        setAppearance(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load appearance settings");
    }
  }, []);

  const updateAppearance = (newApp: Partial<PetAppearance>) => {
    const updated = { ...appearance, ...newApp };
    setAppearance(updated);
    localStorage.setItem('gemini-pet-appearance', JSON.stringify(updated));
  };

  // --- Volume Monitoring Loop (Visuals) ---
  const startVolumeLoop = useCallback(() => {
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    volumeIntervalRef.current = window.setInterval(() => {
      const vol = audioEngine.getVolume();
      setTalkingVolume(vol);
      // If significant volume, ensure emotion is talking/listening based on state
      if (vol > 0.1 && emotion === PetEmotion.IDLE && mode === AppMode.MIMIC) {
          // Just a visual flair
      }
    }, 50);
  }, [emotion, mode]);

  const stopVolumeLoop = useCallback(() => {
    if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
    }
    setTalkingVolume(0);
  }, []);

  useEffect(() => {
    startVolumeLoop();
    return () => stopVolumeLoop();
  }, [startVolumeLoop, stopVolumeLoop]);


  // --- Interactions ---
  const handlePokeHead = () => {
    setEmotion(PetEmotion.SURPRISED);
    audioEngine.playSoundEffect('squeak');
    setTimeout(() => setEmotion(PetEmotion.IDLE), 1000);
  };

  const handlePokeBelly = () => {
    setEmotion(PetEmotion.HAPPY);
    audioEngine.playSoundEffect('giggle');
    setTimeout(() => setEmotion(PetEmotion.IDLE), 1500);
  };

  // --- Mimic Mode Logic ---
  const handleMimicStart = async () => {
    try {
      audioEngine.resume();
      await audioEngine.startRecording();
      setIsRecording(true);
      setEmotion(PetEmotion.LISTENING);
    } catch (e) {
      console.error("Failed to start recording", e);
      alert("Microphone access denied.");
    }
  };

  const handleMimicStop = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setEmotion(PetEmotion.TALKING);
    
    const audioBlob = await audioEngine.stopRecording();
    
    // Play back with pitch shift
    await audioEngine.playWithPitchShift(audioBlob, 1.4); 
    
    setEmotion(PetEmotion.IDLE);
  };

  // --- Smart Mode Logic (Gemini) ---
  const handleSmartStart = async () => {
    if (geminiSessionRef.current) return;
    
    audioEngine.resume();
    // Initialize output context for Gemini audio
    if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    geminiSessionRef.current = new GeminiLiveSession();
    
    try {
        await geminiSessionRef.current.connect({
            onAudioData: (buffer) => {
                playGeminiAudio(buffer);
            },
            onEmotionChange: (newEmotion) => {
                // Don't override if we are in the middle of a "poke" reaction
                setEmotion(prev => (prev === PetEmotion.HAPPY || prev === PetEmotion.SURPRISED) ? prev : newEmotion);
            },
            onTurnComplete: () => {
                // Logic handled in emotion change mostly
            },
            onClose: () => {
                setIsGeminiConnected(false);
                geminiSessionRef.current = null;
                setEmotion(PetEmotion.IDLE);
            }
        });
        setIsGeminiConnected(true);
    } catch (e) {
        console.error(e);
        alert("Could not connect to Zog. Check API Key.");
    }
  };

  const handleSmartStop = async () => {
    if (geminiSessionRef.current) {
        await geminiSessionRef.current.disconnect();
        geminiSessionRef.current = null;
    }
    setIsGeminiConnected(false);
    setEmotion(PetEmotion.IDLE);
  };

  const playGeminiAudio = (buffer: AudioBuffer) => {
      const ctx = outputAudioContextRef.current;
      if (!ctx) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      setTalkingVolume(0.8);
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      source.onended = () => {
          if (ctx.currentTime >= nextStartTimeRef.current) {
             setTalkingVolume(0);
          }
      };
  };

  // --- Main Render ---
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-indigo-900 to-purple-900 relative overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 pointer-events-none">
        <h1 className="text-white/80 font-bold text-lg tracking-widest uppercase">
            {mode === AppMode.MIMIC ? '🦜 Talking Zog' : '🧠 Smart Zog'}
        </h1>
        <div className="flex gap-2 pointer-events-auto">
            <button 
                onClick={() => setShowWardrobe(!showWardrobe)}
                className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
                title="Customize"
            >
                👕
            </button>
            <div className="bg-white/10 px-3 py-2 rounded-full text-xs font-mono text-purple-200 flex items-center">
                {process.env.API_KEY ? 'API KEY ACTIVE' : 'NO API KEY'}
            </div>
        </div>
      </div>

      {/* Wardrobe Modal */}
      {showWardrobe && (
          <div className="absolute top-16 right-4 w-64 bg-slate-800/90 backdrop-blur-md rounded-xl p-4 z-50 border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white">Wardrobe</h3>
                  <button onClick={() => setShowWardrobe(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              
              <div className="space-y-4">
                  {/* Color */}
                  <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Fur Color</label>
                      <div className="flex gap-2">
                          {(['blue', 'purple', 'green', 'pink', 'orange'] as PetColor[]).map(c => (
                              <button 
                                key={c}
                                onClick={() => updateAppearance({color: c})}
                                className={`w-8 h-8 rounded-full border-2 ${appearance.color === c ? 'border-white scale-110' : 'border-transparent opacity-70'}`}
                                style={{backgroundColor: c === 'blue' ? '#60A5FA' : c === 'purple' ? '#A78BFA' : c === 'green' ? '#4ADE80' : c === 'pink' ? '#F472B6' : '#FB923C'}}
                              />
                          ))}
                      </div>
                  </div>

                  {/* Hats */}
                  <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Hat</label>
                      <div className="grid grid-cols-4 gap-2">
                          {(['none', 'cap', 'party'] as PetHat[]).map(h => (
                               <button 
                               key={h}
                               onClick={() => updateAppearance({hat: h})}
                               className={`text-xs p-2 rounded bg-slate-700 ${appearance.hat === h ? 'ring-2 ring-blue-500 bg-slate-600' : 'opacity-70'}`}
                             >
                               {h === 'none' ? '🚫' : h === 'cap' ? '🧢' : '🎉'}
                             </button>
                          ))}
                      </div>
                  </div>

                  {/* Glasses */}
                  <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Eyewear</label>
                      <div className="grid grid-cols-4 gap-2">
                          {(['none', 'sunglasses', 'nerd'] as PetGlasses[]).map(g => (
                               <button 
                               key={g}
                               onClick={() => updateAppearance({glasses: g})}
                               className={`text-xs p-2 rounded bg-slate-700 ${appearance.glasses === g ? 'ring-2 ring-blue-500 bg-slate-600' : 'opacity-70'}`}
                             >
                               {g === 'none' ? '🚫' : g === 'sunglasses' ? '🕶️' : '🤓'}
                             </button>
                          ))}
                      </div>
                  </div>

                   {/* Accessories */}
                   <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Neck</label>
                      <div className="grid grid-cols-4 gap-2">
                          {(['none', 'bowtie', 'scarf'] as PetAccessory[]).map(a => (
                               <button 
                               key={a}
                               onClick={() => updateAppearance({accessory: a})}
                               className={`text-xs p-2 rounded bg-slate-700 ${appearance.accessory === a ? 'ring-2 ring-blue-500 bg-slate-600' : 'opacity-70'}`}
                             >
                               {a === 'none' ? '🚫' : a === 'bowtie' ? '🎀' : '🧣'}
                             </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center relative mt-10">
        <div className="absolute bottom-20 w-40 h-10 bg-black/30 rounded-full blur-xl filter" />
        <Character 
          emotion={emotion}
          talkingVolume={talkingVolume}
          appearance={appearance}
          onPokeHead={handlePokeHead}
          onPokeBelly={handlePokeBelly}
        />
      </div>

      {/* Controls Area */}
      <div className="bg-slate-900/80 backdrop-blur-md pb-12 pt-8 rounded-t-[3rem] shadow-2xl z-20 flex justify-center">
        <Controls 
           mode={mode}
           onSetMode={(m) => {
               if(isGeminiConnected) handleSmartStop();
               setMode(m);
           }}
           isRecording={isRecording}
           isConnected={isGeminiConnected}
           onRecordStart={() => mode === AppMode.MIMIC ? handleMimicStart() : handleSmartStart()}
           onRecordStop={() => mode === AppMode.MIMIC ? handleMimicStop() : handleSmartStop()}
        />
      </div>
      
    </div>
  );
}