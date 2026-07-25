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

export type ViewerSnapshot =
  | { status: "authenticated"; profile: ViewerProfile }
  | { status: "anonymous"; profile: null }
  | { status: "unavailable"; profile: null };

type ViewerApiResponse = {
  status?: string;
  profile?: ViewerProfile | null;
};

type FetchViewerOptions = {
  fetcher?: typeof fetch;
  retryDelayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
};

export async function fetchViewerSnapshot({
  fetcher = fetch,
  retryDelayMs = 300,
  wait = defaultWait,
}: FetchViewerOptions = {}): Promise<ViewerSnapshot> {
  const first = await requestViewerSnapshot(fetcher);
  if (first.status !== "unavailable") return first;

  await wait(retryDelayMs);
  return requestViewerSnapshot(fetcher);
}

export function createViewerLoader(
  load: () => Promise<ViewerSnapshot> = () => fetchViewerSnapshot(),
) {
  let inFlight: Promise<ViewerSnapshot> | null = null;

  return function loadViewer() {
    if (!inFlight) {
      inFlight = load().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}

async function requestViewerSnapshot(fetcher: typeof fetch): Promise<ViewerSnapshot> {
  try {
    const response = await fetcher("/api/me", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = await response.json() as ViewerApiResponse;

    if (
      response.ok
      && data.status === "authenticated"
      && data.profile
      && typeof data.profile.id === "string"
    ) {
      return { status: "authenticated", profile: data.profile };
    }
    if (response.ok && data.status === "anonymous" && data.profile === null) {
      return { status: "anonymous", profile: null };
    }
  } catch {
    // The caller receives an explicit unavailable state and can offer a retry.
  }

  return { status: "unavailable", profile: null };
}

function defaultWait(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}
