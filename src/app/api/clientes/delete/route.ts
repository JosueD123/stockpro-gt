import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/*
 * ==========================================
 * ELIMINAR CLIENTE
 * ==========================================
 *
 * Solo ADMIN puede eliminar clientes.
 */

export async function DELETE(
  req: Request
) {
  try {
    /*
     * VALIDAR PERMISOS
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
     * OBTENER ID
     */

    const body =
      await req.json();

    const id =
      Number(body.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "ID de cliente no válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * VERIFICAR QUE EXISTA
     */

    const customer =
      await prisma.customer.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          name: true,
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Cliente no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ELIMINAR
     */

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message:
        "Cliente eliminado correctamente.",

      customer: {
        id: customer.id,
        name: customer.name,
      },
    });
  } catch (error) {
    console.error(
      "Error eliminando cliente:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el cliente.",
      },
      {
        status: 500,
      }
    );
  }
}