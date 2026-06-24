import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  const response = NextResponse.json({ ok: true });
  const supabase = createRouteClient(request, response);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  return response;
}
