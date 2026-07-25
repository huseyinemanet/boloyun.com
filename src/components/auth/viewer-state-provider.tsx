"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createViewerLoader,
  type ViewerProfile,
  type ViewerSnapshot,
} from "@/components/auth/viewer-state";

export type { ViewerProfile } from "@/components/auth/viewer-state";

type ViewerState = {
  status: "loading" | ViewerSnapshot["status"];
  profile: ViewerProfile | null;
  refresh: () => Promise<void>;
};

const ViewerStateContext = createContext<ViewerState>({
  status: "loading",
  profile: null,
  refresh: async () => {},
});

const loadViewer = createViewerLoader();

export function ViewerStateProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ViewerSnapshot | null>(null);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    const nextSnapshot = await loadViewer();
    if (!mountedRef.current) return;
    setSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [refresh]);

  const value = useMemo<ViewerState>(
    () => ({
      status: snapshot?.status ?? "loading",
      profile: snapshot?.profile ?? null,
      refresh,
    }),
    [refresh, snapshot],
  );
  return <ViewerStateContext.Provider value={value}>{children}</ViewerStateContext.Provider>;
}

export function useViewerState() {
  return useContext(ViewerStateContext);
}
