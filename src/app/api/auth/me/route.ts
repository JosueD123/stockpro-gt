import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/session";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        getSessionCookieName()
      )?.value;

    const session =
      await verifySessionToken(
        token
      );

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Sesión no válida.",
        },
        {
          status: 401,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.userId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Usuario no encontrado.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error en el servidor.",
      },
      {
        status: 500,
      }
    );
  }
}