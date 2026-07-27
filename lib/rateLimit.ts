import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// DB-backed (not in-memory) since Netlify Functions are stateless and don't
// guarantee the same instance handles consecutive requests. Called once per
// attempt (successful or not) — record-then-check would let one request past
// the limit slip through under concurrent requests, so we count first.
export async function isRateLimited(identifier: string, action: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.rateLimitAttempt.count({
    where: { identifier, action, createdAt: { gte: windowStart } },
  });
  if (count >= MAX_ATTEMPTS) return true;

  await prisma.rateLimitAttempt.create({ data: { identifier, action } });
  return false;
}

// Netlify Functions sit behind a proxy — same trustHost reasoning as
// lib/auth.config.ts — so the client's real IP is only available via a
// forwarded header, not the raw connection.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
