"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ViewerProfile = {
  id: string;
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
  status: "loading" | "authenticated" | "anonymous" | "unavailable";
  loaded: boolean;
  profile: ViewerProfile | null;
  refresh: () => Promise<void>;
};

const ViewerStateContext = createContext<ViewerState>({
  status: "loading",
  loaded: false,
  profile: null,
  refresh: async () => {},
});

let viewerPromise: Promise<ViewerProfile | null> | null = null;

export function ViewerStateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const requestId = useRef(0);
  const [state, setState] = useState<Pick<ViewerState, "status" | "profile">>({
    status: "loading",
    profile: null,
  });

  const refresh = useCallback(async () => {
    const activeRequest = ++requestId.current;

    try {
      const nextProfile = await loadViewerProfileWithRetry();
      if (activeRequest !== requestId.current) return;
      setState({
        status: nextProfile ? "authenticated" : "anonymous",
        profile: nextProfile,
      });
    } catch {
      if (activeRequest !== requestId.current) return;
      setState((current) => current.status === "authenticated" || current.status === "anonymous"
        ? current
        : { status: "unavailable", profile: null });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, refresh]);

  useEffect(() => {
    function refreshVisibleViewer() {
      if (document.visibilityState === "visible") void refresh();
    }

    document.addEventListener("visibilitychange", refreshVisibleViewer);
    return () => document.removeEventListener("visibilitychange", refreshVisibleViewer);
  }, [refresh]);

  const value = useMemo(() => ({
    status: state.status,
    loaded: state.status === "authenticated" || state.status === "anonymous",
    profile: state.profile,
    refresh,
  }), [refresh, state]);
  return <ViewerStateContext.Provider value={value}>{children}</ViewerStateContext.Provider>;
}

export function useViewerState() {
  return useContext(ViewerStateContext);
}

async function loadViewerProfile() {
  if (viewerPromise) return viewerPromise;

  const request = fetch("/api/me", {
    cache: "no-store",
    credentials: "same-origin",
  }).then(async (response) => {
    const data = await response.json() as ViewerApiResponse;
    if (!response.ok || data.status === "unavailable") throw new Error("Profil okunamadı.");
    if (data.status === "anonymous") return null;
    if (data.status === "authenticated" && data.profile) return data.profile;
    throw new Error("Geçersiz profil yanıtı.");
  });

  viewerPromise = request;
  try {
    return await request;
  } finally {
    if (viewerPromise === request) viewerPromise = null;
  }
}

async function loadViewerProfileWithRetry() {
  try {
    return await loadViewerProfile();
  } catch {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    return loadViewerProfile();
  }
}

type ViewerApiResponse =
  | { status: "authenticated"; profile: ViewerProfile }
  | { status: "anonymous"; profile: null }
  | { status: "unavailable"; profile: null; code: "viewer_unavailable" };
