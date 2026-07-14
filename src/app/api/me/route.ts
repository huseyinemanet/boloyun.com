import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();

  return NextResponse.json(
    {
      profile: profile
        ? {
            username: profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            firstName: profile.firstName,
            lastName: profile.lastName,
            displayName: profile.displayName,
            role: profile.role,
          }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
