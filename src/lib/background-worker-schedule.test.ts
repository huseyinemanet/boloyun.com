import assert from "node:assert/strict";
import test from "node:test";
import { nextFailureDelay, nextSuccessfulTickSchedule } from "./background-worker-schedule";

const intervals = {
  activeMs: 2_000,
  firstIdleMs: 15_000,
  backedOffIdleMs: 60_000,
  maxIdleMs: 300_000,
};

test("worker aktif ve uyandırılmış durumda hızlı aralığa döner", () => {
  assert.deepEqual(nextSuccessfulTickSchedule({ hasWork: true, idleStreak: 8, wakePending: false, intervals }), {
    delayMs: 2_000,
    idleStreak: 0,
  });
  assert.deepEqual(nextSuccessfulTickSchedule({ hasWork: false, idleStreak: 8, wakePending: true, intervals }), {
    delayMs: 2_000,
    idleStreak: 0,
  });
});

test("worker boşta 15 saniyeden 60 saniyeye ve 5 dakikaya çıkar", () => {
  assert.deepEqual(nextSuccessfulTickSchedule({ hasWork: false, idleStreak: 0, wakePending: false, intervals }), {
    delayMs: 15_000,
    idleStreak: 1,
  });
  assert.deepEqual(nextSuccessfulTickSchedule({ hasWork: false, idleStreak: 1, wakePending: false, intervals }), {
    delayMs: 60_000,
    idleStreak: 2,
  });
  assert.deepEqual(nextSuccessfulTickSchedule({ hasWork: false, idleStreak: 2, wakePending: false, intervals }), {
    delayMs: 300_000,
    idleStreak: 3,
  });
});

test("worker hata beklemesi üst sınıra kadar katlanır", () => {
  assert.equal(nextFailureDelay(1, intervals), 15_000);
  assert.equal(nextFailureDelay(3, intervals), 60_000);
  assert.equal(nextFailureDelay(10, intervals), 300_000);
});
