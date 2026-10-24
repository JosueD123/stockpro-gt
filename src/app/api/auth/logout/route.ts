import { NextResponse } from "next/server";

import { getSessionCookieName } from "@/lib/session";

export async function POST() {
  const response =
    NextResponse.json({
      message: "Sesión cerrada",
    });

  response.cookies.set(
    getSessionCookieName(),
    "",
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      expires: new Date(0),
    }
  );

  return response;
}