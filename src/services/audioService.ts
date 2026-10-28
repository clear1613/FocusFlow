function beep(frequency: number, duration = 0.2): void {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = frequency;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener('ended', () => void context.close());
  } catch (error) {
    console.warn('[FocusFlow] Audio feedback failed.', error);
  }
}

export const audioService = {
  focusComplete(): void {
    beep(880, 0.25);
  },
  breakComplete(): void {
    beep(660, 0.2);
  },
};
