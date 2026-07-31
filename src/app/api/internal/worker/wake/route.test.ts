import assert from "node:assert/strict";
import test from "node:test";
import { getBackgroundWorkerState } from "@/lib/background-worker-state";
import { POST } from "./route";

test("worker wake endpoint rolü ve bearer secret değerini doğrular", async () => {
  const originalRole = process.env.BOL_OYUN_PROCESS_ROLE;
  const originalSecret = process.env.INTERNAL_HEALTH_CHECK_TOKEN;
  const state = getBackgroundWorkerState();
  let scheduledDelay: number | null = null;

  try {
    process.env.BOL_OYUN_PROCESS_ROLE = "worker";
    process.env.INTERNAL_HEALTH_CHECK_TOKEN = "test-secret";
    Object.assign(state, {
      started: true,
      running: false,
      timer: null,
      schedule: (delayMs: number) => { scheduledDelay = delayMs; },
      idleStreak: 7,
      wakePending: false,
      lastTickFinishedAt: new Date().toISOString(),
      consecutiveFailures: 0,
    });

    const denied = POST(new Request("http://worker/api/internal/worker/wake", {
      method: "POST",
      headers: { authorization: "Bearer wrong" },
    }));
    assert.equal(denied.status, 404);

    const accepted = POST(new Request("http://worker/api/internal/worker/wake", {
      method: "POST",
      headers: { authorization: "Bearer test-secret" },
    }));
    assert.equal(accepted.status, 202);
    assert.equal(scheduledDelay, 0);
    assert.equal(state.idleStreak, 0);

    state.running = true;
    state.wakePending = false;
    const pending = POST(new Request("http://worker/api/internal/worker/wake", {
      method: "POST",
      headers: { authorization: "Bearer test-secret" },
    }));
    assert.equal(pending.status, 202);
    assert.equal(state.wakePending, true);

    process.env.BOL_OYUN_PROCESS_ROLE = "web";
    const wrongRole = POST(new Request("http://worker/api/internal/worker/wake", {
      method: "POST",
      headers: { authorization: "Bearer test-secret" },
    }));
    assert.equal(wrongRole.status, 404);
  } finally {
    if (originalRole === undefined) Reflect.deleteProperty(process.env, "BOL_OYUN_PROCESS_ROLE");
    else process.env.BOL_OYUN_PROCESS_ROLE = originalRole;
    if (originalSecret === undefined) Reflect.deleteProperty(process.env, "INTERNAL_HEALTH_CHECK_TOKEN");
    else process.env.INTERNAL_HEALTH_CHECK_TOKEN = originalSecret;
    state.started = false;
    state.running = false;
    state.schedule = null;
    state.wakePending = false;
    state.idleStreak = 0;
  }
});
