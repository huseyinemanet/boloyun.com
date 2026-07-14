"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { CLICK_SOUND_STORAGE_KEY, isBrowserClickSoundEnabled, playClickAudio, type ClickSoundState } from "@/lib/audio/click-sound";
import type { AudioSettings } from "@/lib/settings/types";

type ClickSoundContextValue = {
  browserSoundEnabled: boolean;
  globalSoundEnabled: boolean;
  playClickSound: () => void;
  setBrowserSoundEnabled: (enabled: boolean) => void;
};

const ClickSoundContext = createContext<ClickSoundContextValue>({
  browserSoundEnabled: true,
  globalSoundEnabled: false,
  playClickSound: () => {},
  setBrowserSoundEnabled: () => {},
});

const clickSoundPreferenceChangeEvent = "boloyun_click_sound_preference_change";

export function ClickSoundProvider({ children, settings }: { children: ReactNode; settings: AudioSettings }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<ClickSoundState>({ enabled: settings.clickSoundEnabled, lastPlayedAt: 0 });
  const browserSoundEnabled = useSyncExternalStore(subscribeClickSoundPreference, getClickSoundPreferenceSnapshot, getServerClickSoundPreferenceSnapshot);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CLICK_SOUND_STORAGE_KEY);
      if (stored === null) {
        window.localStorage.setItem(CLICK_SOUND_STORAGE_KEY, "true");
        window.dispatchEvent(new Event(clickSoundPreferenceChangeEvent));
      }
    } catch {
      // Storage can be unavailable; the server snapshot keeps the feature on.
    }
  }, []);

  useEffect(() => {
    stateRef.current.enabled = settings.clickSoundEnabled && browserSoundEnabled;
  }, [browserSoundEnabled, settings.clickSoundEnabled]);

  useEffect(() => {
    if (!settings.clickSoundUrl) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(settings.clickSoundUrl);
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [settings.clickSoundUrl]);

  const setBrowserSoundEnabled = useCallback((enabled: boolean) => {
    try {
      window.localStorage.setItem(CLICK_SOUND_STORAGE_KEY, String(enabled));
      window.dispatchEvent(new Event(clickSoundPreferenceChangeEvent));
    } catch {
      // Storage can be unavailable; the in-memory preference still applies.
    }
  }, []);

  const playClickSound = useCallback(() => {
    playClickAudio(audioRef.current, stateRef.current, performance.now());
  }, []);

  const value = useMemo<ClickSoundContextValue>(() => ({
    browserSoundEnabled,
    globalSoundEnabled: settings.clickSoundEnabled,
    playClickSound,
    setBrowserSoundEnabled,
  }), [browserSoundEnabled, playClickSound, setBrowserSoundEnabled, settings.clickSoundEnabled]);

  return <ClickSoundContext.Provider value={value}>{children}</ClickSoundContext.Provider>;
}

export function useClickSound() {
  return useContext(ClickSoundContext);
}

function subscribeClickSoundPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(clickSoundPreferenceChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(clickSoundPreferenceChangeEvent, onStoreChange);
  };
}

function getClickSoundPreferenceSnapshot() {
  try {
    return isBrowserClickSoundEnabled(window.localStorage.getItem(CLICK_SOUND_STORAGE_KEY));
  } catch {
    return true;
  }
}

function getServerClickSoundPreferenceSnapshot() {
  return true;
}
