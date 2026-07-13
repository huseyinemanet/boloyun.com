import openNextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

const worker = {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  scheduled(event, env, ctx) {
    ctx.waitUntil(runAiTranslationCron(event, env, ctx));
  },
};

export default worker;

async function runAiTranslationCron(event, env, ctx) {
  const secret = env.AI_TRANSLATION_CRON_SECRET;
  if (!secret) {
    console.warn("[ai-translation] cron.skip", { reason: "AI_TRANSLATION_CRON_SECRET eksik", cron: event.cron });
    return;
  }

  const siteUrl = env.SITE_URL || "https://boloyun.com";
  const url = new URL("/api/admin/ai/automation", siteUrl);
  let response;
  try {
    response = await openNextWorker.fetch(new Request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "cron",
        cron: event.cron,
        scheduledTime: event.scheduledTime,
      }),
    }), env, ctx);
  } catch (error) {
    console.error("[ai-translation] cron.exception", { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ai-translation] cron.failed", { status: response.status, body: body.slice(0, 500) });
  }
}
