/** How long a bubble stays up, and the quiet between two of one character (s). */
const SHOW_SECONDS = 4;
const MIN_GAP = 5;
const MAX_GAP = 9;
/** Only characters this near the guest speak (m): the gate's greeters reach the entrance spawn. */
export const SPEECH_REACH = 9.5;
/** Bubbles up at once in a scene: more would cover a phone screen. */
export const MAX_BUBBLES = 2;

export interface SpeechState {
  /** Index of the line on show, or `null` between lines. */
  line: number | null;
  /** The previous line, never repeated at once. */
  last: number | null;
  /** Seconds to the next change. */
  timer: number;
}

export function startSpeech(phase: number): SpeechState {
  return { line: null, last: null, timer: 1 + phase * MAX_GAP };
}

function pickLine(count: number, last: number | null, random: () => number): number {
  if (count < 2) return 0;
  const line = Math.min(count - 1, Math.floor(random() * count));
  return line === last ? (line + 1) % count : line;
}

export interface SpeechInput {
  delta: number;
  lineCount: number;
  /** Near the guest, with nothing covering the world. */
  canSpeak: boolean;
  /** Bubbles already up in this scene. */
  active: number;
  random: () => number;
}

/** One frame of a character's random lines, pure. A blocked character tries again next frame. */
export function stepSpeech(state: SpeechState, input: SpeechInput): SpeechState {
  const { delta, lineCount, canSpeak, active, random } = input;
  if (lineCount === 0) return state;
  if (state.line !== null) {
    const timer = state.timer - delta;
    if (timer > 0 && canSpeak) return { ...state, timer };
    const gap = MIN_GAP + random() * (MAX_GAP - MIN_GAP);
    return { line: null, last: state.line, timer: gap };
  }
  const timer = Math.max(0, state.timer - delta);
  if (timer > 0 || !canSpeak || active >= MAX_BUBBLES) return { ...state, timer };
  return { ...state, line: pickLine(lineCount, state.last, random), timer: SHOW_SECONDS };
}
