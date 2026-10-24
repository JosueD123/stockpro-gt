import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getSessionCookieName,
  SESSION_DURATION_SECONDS,
} from "@/lib/session";

function isBcryptHash(password: string) {
  return (
    password.startsWith("$2a$") ||
    password.startsWith("$2b$") ||
    password.startsWith("$2y$")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            "Correo y contraseña son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Correo o contraseña incorrectos.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Compatibilidad temporal:
     *
     * Si la contraseña ya está cifrada,
     * usamos bcrypt.
     *
     * Si todavía está en texto plano,
     * comprobamos la contraseña antigua y
     * automáticamente la migramos a bcrypt.
     */

    let validPassword = false;

    if (
      isBcryptHash(user.password)
    ) {
      validPassword =
        await bcrypt.compare(
          password,
          user.password
        );
    } else {
      validPassword =
        user.password === password;

      if (validPassword) {
        const hashedPassword =
          await bcrypt.hash(
            password,
            12
          );

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            password:
              hashedPassword,
          },
        });
      }
    }

    if (!validPassword) {
      return NextResponse.json(
        {
          error:
            "Correo o contraseña incorrectos.",
        },
        {
          status: 401,
        }
      );
    }

    const sessionToken =
      await createSessionToken(
        user.id,
        user.role
      );

    const response =
      NextResponse.json({
        message: "Login correcto",

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

    response.cookies.set(
      getSessionCookieName(),
      sessionToken,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge:
          SESSION_DURATION_SECONDS,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Error en login:",
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