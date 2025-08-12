import { create } from 'zustand';

interface AudioManagerState {
  currentlyPlayingAudio: HTMLAudioElement | null;
  currentlyPlayingId: string | null;
  setCurrentlyPlayingAudio: (audio: HTMLAudioElement | null, id: string | null) => void;
  stopAllAudio: () => void;
}

export const useAudioManager = create<AudioManagerState>((set, get) => ({
  currentlyPlayingAudio: null,
  currentlyPlayingId: null,
  setCurrentlyPlayingAudio: (audio: HTMLAudioElement | null, id: string | null) => {
    const current = get().currentlyPlayingAudio;
    // Pause the currently playing audio if it's different (don't reset position)
    if (current && current !== audio) {
      current.pause();
      // Don't reset currentTime - keep the position where it was paused
    }
    set({ currentlyPlayingAudio: audio, currentlyPlayingId: id });
  },
  stopAllAudio: () => {
    const current = get().currentlyPlayingAudio;
    if (current) {
      current.pause();
      // Don't reset currentTime - keep the position where it was paused
    }
    set({ currentlyPlayingAudio: null, currentlyPlayingId: null });
  },
})); 