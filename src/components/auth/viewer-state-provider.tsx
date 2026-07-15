"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ViewerProfile = {
  username: string;
  email: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  role: "admin" | "member";
  status: "active" | "blocked";
};

type ViewerState = {
  loaded: boolean;
  profile: ViewerProfile | null;
  refresh: () => Promise<void>;
};

const ViewerStateContext = createContext<ViewerState>({
  loaded: false,
  profile: null,
  refresh: async () => {},
});

let viewerPromise: Promise<ViewerProfile | null> | null = null;

export function ViewerStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    viewerPromise = null;
    if (!hasSupabaseAuthCookie()) {
      setProfile(null);
      setLoaded(true);
      return;
    }
    const nextProfile = await loadViewerProfile();
    setProfile(nextProfile);
    setLoaded(true);
  }

  useEffect(() => {
    let mounted = true;
    if (!hasSupabaseAuthCookie()) {
      queueMicrotask(() => {
        if (mounted) setLoaded(true);
      });
      return () => {
        mounted = false;
      };
    }

    void loadViewerProfile().then((nextProfile) => {
      if (!mounted) return;
      setProfile(nextProfile);
      setLoaded(true);
    }).catch(() => {
      if (!mounted) return;
      setProfile(null);
      setLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({ loaded, profile, refresh }), [loaded, profile]);
  return <ViewerStateContext.Provider value={value}>{children}</ViewerStateContext.Provider>;
}

export function useViewerState() {
  return useContext(ViewerStateContext);
}

export function hasSupabaseAuthCookie() {
  return typeof document !== "undefined" && /(?:^|;\s*)(?:sb-[^=]+-auth-token|supabase-auth-token(?:\.[^=]+)?)=/.test(document.cookie);
}

async function loadViewerProfile() {
  viewerPromise ??= fetch("/api/me", {
    cache: "no-store",
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Profil okunamadı.");
    const data = await response.json() as { profile?: ViewerProfile | null };
    return data.profile ?? null;
  }).catch((error) => {
    viewerPromise = null;
    throw error;
  });

  return viewerPromise;
}
