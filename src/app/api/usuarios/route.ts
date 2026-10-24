import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const ALLOWED_ROLES = [
  "ADMIN",
  "SELLER",
  "VIEWER",
];

export async function POST(
  request: Request
) {
  try {
    /*
     * ==========================================
     * SEGURIDAD
     * ==========================================
     *
     * Solo un administrador puede crear usuarios.
     */

    const auth =
      await requireRole([
        "ADMIN",
      ]);

    if (!auth.ok) {
      return NextResponse.json(
        {
          error: auth.error,
        },
        {
          status: auth.status,
        }
      );
    }

    /*
     * ==========================================
     * DATOS DEL FORMULARIO
     * ==========================================
     */

    const body =
      await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const role =
      typeof body.role === "string"
        ? body.role
        : "";

    /*
     * ==========================================
     * VALIDACIONES
     * ==========================================
     */

    if (
      !name ||
      !email ||
      !password ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            "Todos los campos son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "La contraseña debe tener al menos 8 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_ROLES.includes(
        role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El rol seleccionado no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * VALIDAR CORREO DUPLICADO
     * ==========================================
     */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "Ya existe un usuario con ese correo electrónico.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * CIFRAR CONTRASEÑA
     * ==========================================
     */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * ==========================================
     * CREAR USUARIO
     * ==========================================
     */

    const user =
      await prisma.user.create({
        data: {
          name,
          email,
          password:
            hashedPassword,
          role,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

    return NextResponse.json(
      {
        message:
          "Usuario creado correctamente.",
        user,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error creando usuario:",
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