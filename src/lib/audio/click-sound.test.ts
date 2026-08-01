import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CLICK_SOUND_THROTTLE_MS, isBrowserClickSoundEnabled, playClickAudio, type ClickSoundState } from "@/lib/audio/click-sound";

test("click audio restarts the current audio element", async () => {
  let played = 0;
  const audio = {
    currentTime: 2,
    play: () => {
      played += 1;
      return Promise.resolve();
    },
  };
  const state: ClickSoundState = { enabled: true, lastPlayedAt: -CLICK_SOUND_THROTTLE_MS };

  assert.equal(playClickAudio(audio, state, 1_000), true);
  assert.equal(audio.currentTime, 0);
  assert.equal(played, 1);
});

test("click audio throttles very fast repeats", () => {
  let played = 0;
  const audio = { currentTime: 0, play: () => { played += 1; } };
  const state: ClickSoundState = { enabled: true, lastPlayedAt: 1_000 };

  assert.equal(playClickAudio(audio, state, 1_000 + CLICK_SOUND_THROTTLE_MS - 1), false);
  assert.equal(played, 0);
});

test("click audio catches rejected play promises", async () => {
  const audio = {
    currentTime: 1,
    play: () => Promise.reject(new Error("blocked")),
  };
  const state: ClickSoundState = { enabled: true, lastPlayedAt: -CLICK_SOUND_THROTTLE_MS };

  assert.equal(playClickAudio(audio, state, 1_000), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
});

test("browser click sound preference defaults on when unset", () => {
  assert.equal(isBrowserClickSoundEnabled(null), true);
  assert.equal(isBrowserClickSoundEnabled("true"), true);
  assert.equal(isBrowserClickSoundEnabled("false"), false);
});

test("settings navigation triggers click audio before desktop and mobile navigation", async () => {
  const source = await readFile(new URL("../../app/admin/settings/settings-navigation.tsx", import.meta.url), "utf8");

  assert.match(source, /const \{ playClickSound \} = useClickSound\(\)/);
  assert.match(source, /onValueChange=\{navigateFromMobile\}/);
  assert.match(source, /onClick=\{\(event\) => playNavigationSound\(event, href\)\}/);
  assert.doesNotMatch(source, /SoundLink/);
});
