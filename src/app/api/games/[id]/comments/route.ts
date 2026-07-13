import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createPendingComment } from "@/lib/db-comments";
import { getPublicSettings } from "@/lib/db-settings";
import { isUuid } from "@/lib/game-session";
import { hasTrustedMutationOrigin } from "@/lib/request-security";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid game id." }, { status: 400 });

  const settings = await getPublicSettings();
  if (!settings.community.commentsEnabled) return NextResponse.json({ error: "Comments are disabled." }, { status: 403 });

  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (body.length < 3 || body.length > 1000) {
    return NextResponse.json({ error: "Yorum 3 ile 1000 karakter arasında olmalı." }, { status: 400 });
  }

  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (profile.status === "blocked") return NextResponse.json({ error: "Account is blocked." }, { status: 403 });
  const blocked = settings.community.blockedWords.find((word) => word && body.toLocaleLowerCase("tr-TR").includes(word.toLocaleLowerCase("tr-TR")));
  if (blocked) return NextResponse.json({ error: "Yorum yasaklı bir ifade içeriyor." }, { status: 400 });

  const status = profile.role === "admin" || !settings.community.commentsRequireApproval ? "approved" : "pending";
  await createPendingComment(id, body, profile.id, status, settings.community.dailyCommentLimit);
  return NextResponse.json({ status });
}
