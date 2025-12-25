export enum PetEmotion {
  IDLE = 'IDLE',
  HAPPY = 'HAPPY',
  ANGRY = 'ANGRY',
  SURPRISED = 'SURPRISED',
  TALKING = 'TALKING',
  LISTENING = 'LISTENING',
  SLEEPY = 'SLEEPY'
}

export enum AppMode {
  MIMIC = 'MIMIC', // Classic Talking Tom style (Record -> Pitch Shift Playback)
  SMART = 'SMART'  // Gemini Live API (Conversational)
}

export interface AudioVisualizerData {
  volume: number; // 0.0 to 1.0
}

export type PetColor = 'blue' | 'purple' | 'green' | 'pink' | 'orange';
export type PetHat = 'none' | 'cap' | 'party' | 'astronaut';
export type PetGlasses = 'none' | 'sunglasses' | 'nerd';
export type PetAccessory = 'none' | 'bowtie' | 'scarf';

export interface PetAppearance {
  color: PetColor;
  hat: PetHat;
  glasses: PetGlasses;
  accessory: PetAccessory;
}

export const DEFAULT_APPEARANCE: PetAppearance = {
  color: 'blue',
  hat: 'none',
  glasses: 'none',
  accessory: 'none'
};