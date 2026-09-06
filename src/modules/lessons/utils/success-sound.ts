type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let lessonAudioContext: AudioContext | null = null;

function audioContextConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext ?? null;
}

/** Call inside a learner gesture so mobile browsers authorise the later chime. */
export function primeLessonSuccessSound() {
  try {
    const AudioContextConstructor = audioContextConstructor();
    if (!AudioContextConstructor) return;
    if (!lessonAudioContext || lessonAudioContext.state === "closed") {
      lessonAudioContext = new AudioContextConstructor();
    }
    if (lessonAudioContext.state === "suspended") void lessonAudioContext.resume();
  } catch {
    // Audio is an optional enhancement.
  }
}

/** A short two-note chime generated in-browser; no audio file is downloaded. */
export function playLessonSuccessSound() {
  try {
    primeLessonSuccessSound();
    const context = lessonAudioContext;
    if (!context || context.state !== "running") return;
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.045, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    master.connect(context.destination);

    [659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + (index * 0.055));
      oscillator.connect(master);
      oscillator.start(now + (index * 0.055));
      oscillator.stop(now + 0.25);
    });
  } catch {
    // Audio permissions and devices must never affect the lesson flow.
  }
}
