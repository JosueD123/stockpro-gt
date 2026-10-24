import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const ALLOWED_ROLES = [
  "ADMIN",
  "SELLER",
  "VIEWER",
];

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * ==========================================
 * CONSULTAR USUARIO
 * ==========================================
 */

export async function GET(
  request: Request,
  { params }: Props
) {
  try {
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

    const { id } =
      await params;

    const userId =
      Number(id);

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Usuario no válido.",
        },
        {
          status: 400,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Usuario no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error(
      "Error consultando usuario:",
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

/*
 * ==========================================
 * ACTUALIZAR USUARIO
 * ==========================================
 */

export async function PUT(
  request: Request,
  { params }: Props
) {
  try {
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

    const { id } =
      await params;

    const userId =
      Number(id);

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Usuario no válido.",
        },
        {
          status: 400,
        }
      );
    }

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

    const role =
      typeof body.role === "string"
        ? body.role
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      !name ||
      !email ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            "Nombre, correo y rol son obligatorios.",
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

    if (
      password &&
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "La nueva contraseña debe tener al menos 8 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "Usuario no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const emailOwner =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (
      emailOwner &&
      emailOwner.id !== userId
    ) {
      return NextResponse.json(
        {
          error:
            "Ya existe otro usuario con ese correo electrónico.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Evitar que el último administrador
     * pierda el rol ADMIN.
     */

    if (
      existingUser.role ===
        "ADMIN" &&
      role !== "ADMIN"
    ) {
      const adminCount =
        await prisma.user.count({
          where: {
            role: "ADMIN",
          },
        });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              "No puedes cambiar el rol del último administrador del sistema.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const data: {
      name: string;
      email: string;
      role: string;
      password?: string;
    } = {
      name,
      email,
      role,
    };

    if (password) {
      data.password =
        await bcrypt.hash(
          password,
          12
        );
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },

        data,

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      message:
        "Usuario actualizado correctamente.",

      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Error actualizando usuario:",
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

/*
 * ==========================================
 * ELIMINAR USUARIO
 * ==========================================
 */

export async function DELETE(
  request: Request,
  { params }: Props
) {
  try {
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

    const { id } =
      await params;

    const userId =
      Number(id);

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Usuario no válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * NO PERMITIR AUTOELIMINACIÓN
     */

    if (
      auth.session.userId ===
      userId
    ) {
      return NextResponse.json(
        {
          error:
            "No puedes eliminar tu propia cuenta mientras tienes la sesión iniciada.",
        },
        {
          status: 400,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Usuario no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * PROTEGER AL ÚLTIMO ADMINISTRADOR
     */

    if (
      user.role === "ADMIN"
    ) {
      const adminCount =
        await prisma.user.count({
          where: {
            role: "ADMIN",
          },
        });

      if (
        adminCount <= 1
      ) {
        return NextResponse.json(
          {
            error:
              "No se puede eliminar al último administrador del sistema.",
          },
          {
            status: 400,
          }
        );
      }
    }

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({
      message:
        "Usuario eliminado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error eliminando usuario:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el usuario.",
      },
      {
        status: 500,
      }
    );
  }
}