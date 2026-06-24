import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteClient(request, response);
  await supabase.auth.signOut();
  return response;
}
