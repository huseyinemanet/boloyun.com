import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("Ed25519 manifest imzası değiştirilen manifesti reddeder", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "boloyun-signing-"));
  try {
    const privateKey = path.join(directory, "private.pem");
    const publicKey = path.join(directory, "public.pem");
    const manifest = path.join(directory, "release.manifest");
    const signature = path.join(directory, "release.sig");
    execFileSync("openssl", ["genpkey", "-algorithm", "Ed25519", "-out", privateKey]);
    execFileSync("openssl", ["pkey", "-in", privateKey, "-pubout", "-out", publicKey]);
    writeFileSync(manifest, "schema_version=1\nrevision=" + "a".repeat(40) + "\n");
    execFileSync("openssl", ["pkeyutl", "-sign", "-rawin", "-inkey", privateKey, "-in", manifest, "-out", signature]);
    execFileSync("openssl", ["pkeyutl", "-verify", "-pubin", "-inkey", publicKey, "-rawin", "-in", manifest, "-sigfile", signature]);
    writeFileSync(manifest, readFileSync(manifest, "utf8") + "tampered=true\n");
    const result = spawnSync("openssl", ["pkeyutl", "-verify", "-pubin", "-inkey", publicKey, "-rawin", "-in", manifest, "-sigfile", signature]);
    assert.notEqual(result.status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
