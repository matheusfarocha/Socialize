import { NextResponse } from "next/server";
import { getPresenceErrorMessage } from "@/lib/presence";
import { createPublicSupabaseClient } from "@/lib/supabase";

export async function GET() {
  return handleCleanup();
}

export async function POST() {
  return handleCleanup();
}

async function handleCleanup() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("cleanup_active_users");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getPresenceErrorMessage(error.message),
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: typeof data === "number" ? data : 0,
  });
}
