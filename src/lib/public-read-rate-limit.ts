// A cheap, bounded backstop for public reads on the single-process VPS. Nginx
// provides the shared perimeter limit. Auth and mutations retain their DB limits.
export function createPublicReadLimiter(maxEntries = 10_000) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (key: string, limit = 90, windowMs = 60_000, now = Date.now()) => {
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= maxEntries) {
        for (const [subject, entry] of buckets) if (entry.resetAt <= now) buckets.delete(subject);
        if (!buckets.has(key) && buckets.size >= maxEntries) return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return { allowed: bucket.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  };
}

export const consumePublicReadLimit = createPublicReadLimiter();
