import { NextResponse } from "next/server";
import { getCurrentProfile, getDisplayName } from "@/lib/auth";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.status === "blocked") return NextResponse.json({ profile: null });

  return NextResponse.json({
    profile: {
      username: profile.username,
      displayName: getDisplayName(profile),
      avatarUrl: profile.avatarUrl,
      role: profile.role,
    },
  });
}
