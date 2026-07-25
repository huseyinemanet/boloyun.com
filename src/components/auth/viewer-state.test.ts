import assert from "node:assert/strict";
import test from "node:test";
import {
  createViewerLoader,
  fetchViewerSnapshot,
  type ViewerProfile,
  type ViewerSnapshot,
} from "./viewer-state";

const profile: ViewerProfile = {
  id: "profile-id",
  username: "oyuncu",
  email: "oyuncu@example.com",
  avatarUrl: null,
  firstName: null,
  lastName: null,
  displayName: null,
  role: "member",
  status: "active",
};

test("viewer API authenticated ve anonymous durumlarını ayrıştırır", async () => {
  const authenticated = await fetchViewerSnapshot({
    fetcher: async () => Response.json({ status: "authenticated", profile }),
  });
  const anonymous = await fetchViewerSnapshot({
    fetcher: async () => Response.json({ status: "anonymous", profile: null }),
  });

  assert.deepEqual(authenticated, { status: "authenticated", profile });
  assert.deepEqual(anonymous, { status: "anonymous", profile: null });
});

test("geçici unavailable sonucu bir kez yeniden denenir", async () => {
  let requestCount = 0;
  const result = await fetchViewerSnapshot({
    fetcher: async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return Response.json(
          { status: "unavailable", profile: null, code: "viewer_unavailable" },
          { status: 503 },
        );
      }
      return Response.json({ status: "authenticated", profile });
    },
    retryDelayMs: 0,
    wait: async () => {},
  });

  assert.equal(requestCount, 2);
  assert.deepEqual(result, { status: "authenticated", profile });
});

test("viewer loader yalnız devam eden isteği paylaşır ve eski null sonucu saklamaz", async () => {
  const snapshots: ViewerSnapshot[] = [
    { status: "anonymous", profile: null },
    { status: "authenticated", profile },
  ];
  let loadCount = 0;
  const loader = createViewerLoader(async () => {
    loadCount += 1;
    await Promise.resolve();
    return snapshots.shift() ?? { status: "unavailable", profile: null };
  });

  const first = loader();
  const duplicate = loader();
  assert.equal(first, duplicate);
  assert.deepEqual(await first, { status: "anonymous", profile: null });
  assert.deepEqual(await loader(), { status: "authenticated", profile });
  assert.equal(loadCount, 2);
});

test("bozuk veya başarısız viewer yanıtı anonymous sayılmaz", async () => {
  const malformed = await fetchViewerSnapshot({
    fetcher: async () => Response.json({ profile: null }),
    retryDelayMs: 0,
    wait: async () => {},
  });

  assert.deepEqual(malformed, { status: "unavailable", profile: null });
});
