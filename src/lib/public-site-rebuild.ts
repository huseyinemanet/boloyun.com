import "server-only";

import { recordAdminAudit } from "@/lib/admin-audit";

export type PublicSiteRebuildResult =
  | { ok: true; skipped: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export async function requestPublicSiteRebuild(reason: string, actorProfileId: string): Promise<PublicSiteRebuildResult> {
  const hookUrl = process.env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return { ok: true, skipped: true, reason: "CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is not configured." };
  }

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason, actorProfileId, requestedAt: new Date().toISOString() }),
      cache: "no-store",
    });

    if (!response.ok) {
      const error = `Cloudflare Pages deploy hook failed with HTTP ${response.status}.`;
      await recordRebuildFailure(actorProfileId, reason, error);
      return { ok: false, error };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRebuildFailure(actorProfileId, reason, message);
    return { ok: false, error: message };
  }
}

async function recordRebuildFailure(actorProfileId: string, reason: string, error: string) {
  try {
    await recordAdminAudit({
      actorProfileId,
      action: "public_site.rebuild_failed",
      targetType: "cloudflare_pages",
      details: {
        reason,
        error: error.slice(0, 500),
      },
    });
  } catch (auditError) {
    console.error("[public-site-rebuild] failed to record audit event", auditError);
  }
}

export function publicRebuildMessage(result: PublicSiteRebuildResult) {
  if (result.ok) return "";
  return "Kayıt tamamlandı ancak public site güncellemesi tetiklenemedi. Lütfen deploy hook ayarını kontrol edin.";
}
