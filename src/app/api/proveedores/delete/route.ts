import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/*
 * ==========================================
 * ELIMINAR PROVEEDOR
 * ==========================================
 *
 * Solo ADMIN puede eliminar proveedores.
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
            "ID de proveedor no válido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * BUSCAR PROVEEDOR
     */

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id,
        },

        include: {
          products: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            "Proveedor no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * VALIDAR PRODUCTOS ASOCIADOS
     */

    if (
      supplier.products.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar el proveedor porque tiene productos asociados.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ELIMINAR PROVEEDOR
     */

    await prisma.supplier.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message:
        "Proveedor eliminado correctamente.",

      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
    });
  } catch (error) {
    console.error(
      "Error eliminando proveedor:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el proveedor.",
      },
      {
        status: 500,
      }
    );
  }
}