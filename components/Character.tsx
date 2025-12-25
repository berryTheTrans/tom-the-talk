import React, { useEffect, useState } from 'react';
import { PetEmotion, PetAppearance } from '../types';

interface CharacterProps {
  emotion: PetEmotion;
  talkingVolume: number; // 0 to 1, drives mouth opening
  appearance: PetAppearance;
  onPokeHead: () => void;
  onPokeBelly: () => void;
}

const Character: React.FC<CharacterProps> = ({ emotion, talkingVolume, appearance, onPokeHead, onPokeBelly }) => {
  const [blink, setBlink] = useState(false);
  const [bounce, setBounce] = useState(false);

  // Blink logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // React to emotion changes
  useEffect(() => {
    if (emotion === PetEmotion.SURPRISED || emotion === PetEmotion.HAPPY) {
      setBounce(true);
      setTimeout(() => setBounce(false), 500);
    }
  }, [emotion]);

  const eyeScaleY = blink ? 0.1 : (emotion === PetEmotion.SURPRISED ? 1.2 : 1);
  const mouthOpenAmount = Math.max(0.1, talkingVolume * 30); // Dynamic mouth height

  // Colors
  const colors: Record<string, { body: string, belly: string, stroke: string }> = {
    blue: { body: '#60A5FA', belly: '#93C5FD', stroke: '#2563EB' },
    purple: { body: '#A78BFA', belly: '#C4B5FD', stroke: '#7C3AED' },
    green: { body: '#4ADE80', belly: '#86EFAC', stroke: '#16A34A' },
    pink: { body: '#F472B6', belly: '#FBCFE8', stroke: '#DB2777' },
    orange: { body: '#FB923C', belly: '#FDBA74', stroke: '#EA580C' },
  };

  const scheme = colors[appearance.color] || colors.blue;

  return (
    <div className={`relative w-80 h-80 transition-transform duration-300 ${bounce ? 'animate-squish' : ''}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        {/* Body */}
        <path 
          d="M50 150 C 20 150, 20 80, 50 60 C 70 40, 130 40, 150 60 C 180 80, 180 150, 150 180 C 110 200, 90 200, 50 180 Z" 
          fill={scheme.body}
          stroke={scheme.stroke}
          strokeWidth="3"
        />
        
        {/* Belly */}
        <ellipse cx="100" cy="140" rx="40" ry="30" fill={scheme.belly} opacity="0.6" />

        {/* Eyes */}
        <g transform={`scale(1, ${eyeScaleY})`} transform-origin="100 80" className="transition-all duration-100">
          <circle cx="70" cy="80" r="12" fill="white" stroke={scheme.stroke} strokeWidth="2" />
          <circle cx="70" cy="80" r="5" fill="black" />
          
          <circle cx="130" cy="80" r="12" fill="white" stroke={scheme.stroke} strokeWidth="2" />
          <circle cx="130" cy="80" r="5" fill="black" />
        </g>

        {/* Mouth - Dynamic based on volume */}
        <g transform={`translate(100, 110)`}>
          {emotion === PetEmotion.ANGRY ? (
             <path d="M-20 10 Q 0 0 20 10" fill="none" stroke="black" strokeWidth="3" />
          ) : (
            <ellipse 
              cx="0" 
              cy="0" 
              rx={emotion === PetEmotion.HAPPY ? 25 : 20} 
              ry={mouthOpenAmount} 
              fill="#4A044E" 
            />
          )}
          {/* Tongue */}
          {mouthOpenAmount > 5 && (
             <path d={`M-10 ${mouthOpenAmount-5} Q 0 ${mouthOpenAmount+5} 10 ${mouthOpenAmount-5}`} fill="#F472B6" />
          )}
        </g>
        
        {/* Arms */}
        <path d="M40 120 Q 20 140 30 160" stroke={scheme.body} strokeWidth="12" strokeLinecap="round" fill="none"/>
        <path d="M160 120 Q 180 140 170 160" stroke={scheme.body} strokeWidth="12" strokeLinecap="round" fill="none"/>

        {/* --- Cosmetics --- */}

        {/* Glasses */}
        {appearance.glasses === 'sunglasses' && (
          <g transform="translate(100, 80)">
             <path d="M-40 0 Q -25 5 -10 0 L -5 0 L -5 -5 L -55 -5 L -55 0 Z" fill="#111" />
             <path d="M40 0 Q 25 5 10 0 L 5 0 L 5 -5 L 55 -5 L 55 0 Z" fill="#111" />
             <line x1="-10" y1="-2" x2="10" y2="-2" stroke="#111" strokeWidth="2" />
          </g>
        )}
        {appearance.glasses === 'nerd' && (
          <g transform="translate(100, 80)">
            <circle cx="-30" cy="0" r="16" fill="none" stroke="black" strokeWidth="3" />
            <circle cx="30" cy="0" r="16" fill="none" stroke="black" strokeWidth="3" />
            <line x1="-14" y1="0" x2="14" y2="0" stroke="black" strokeWidth="3" />
          </g>
        )}

        {/* Accessories (Neck) */}
        {appearance.accessory === 'bowtie' && (
          <g transform="translate(100, 145)">
            <path d="M0 0 L -15 -10 L -15 10 Z" fill="#EF4444" />
            <path d="M0 0 L 15 -10 L 15 10 Z" fill="#EF4444" />
            <circle cx="0" cy="0" r="4" fill="#B91C1C" />
          </g>
        )}
        {appearance.accessory === 'scarf' && (
           <path d="M70 140 Q 100 160 130 140 L 130 150 Q 100 170 70 150 Z" fill="#F59E0B" />
        )}

        {/* Hats */}
        {appearance.hat === 'cap' && (
          <g transform="translate(100, 45)">
             <path d="M-40 10 Q 0 -30 40 10 Z" fill="#DC2626" />
             <path d="M-45 10 L 45 10 L 45 12 L -45 12 Z" fill="#991B1B" />
             <rect x="-10" y="8" width="80" height="4" fill="#991B1B" transform="translate(0,0)" />
          </g>
        )}
        {appearance.hat === 'party' && (
           <g transform="translate(100, 40)">
             <polygon points="-20,20 20,20 0,-40" fill="#EC4899" />
             <circle cx="0" cy="-40" r="5" fill="#FBBF24" />
           </g>
        )}
        {appearance.hat === 'astronaut' && (
           <path d="M50 60 C 50 30 150 30 150 60" fill="none" stroke="#E2E8F0" strokeWidth="4" strokeDasharray="10,5" />
        )}

      </svg>

      {/* Interactive Hit Areas */}
      {/* Head */}
      <div 
        className="absolute top-[10%] left-[25%] w-[50%] h-[30%] cursor-pointer hover:bg-white/10 rounded-full transition-colors"
        onClick={(e) => {
            e.stopPropagation();
            onPokeHead();
        }}
      />
      {/* Belly */}
      <div 
        className="absolute top-[50%] left-[30%] w-[40%] h-[35%] cursor-pointer hover:bg-white/10 rounded-full transition-colors"
        onClick={(e) => {
            e.stopPropagation();
            onPokeBelly();
        }}
      />
    </div>
  );
};

export default Character;