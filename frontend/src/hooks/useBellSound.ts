import { useCallback } from 'react';

export const useBellSound = () => {
  const playBellSound = useCallback(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }

    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.8);
    oscillator.stop(audioCtx.currentTime + 1.2);

    oscillator.onended = () => {
      audioCtx.close().catch(() => {});
    };
  }, []);

  return { playBellSound };
};
