export const CLICK_SOUND_STORAGE_KEY = "boloyun_click_sound_enabled";
export const CLICK_SOUND_THROTTLE_MS = 80;

export type ClickSoundState = {
  enabled: boolean;
  lastPlayedAt: number;
};

type PlayableAudio = {
  currentTime: number;
  play: () => Promise<void> | void;
};

export function playClickAudio(audio: PlayableAudio | null, state: ClickSoundState, now: number) {
  if (!audio || !state.enabled || now - state.lastPlayedAt < CLICK_SOUND_THROTTLE_MS) return false;

  state.lastPlayedAt = now;
  audio.currentTime = 0;

  try {
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {
        // Browser autoplay policies or unsupported formats must not break clicks.
      });
    }
  } catch {
    return false;
  }

  return true;
}

export function isBrowserClickSoundEnabled(value: string | null) {
  return value === null ? true : value === "true";
}
