import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/*
 * ==========================================
 * OBTENER CONFIGURACIÓN DEL NEGOCIO
 * ==========================================
 *
 * Puede consultar la configuración básica
 * cualquier usuario autenticado.
 *
 * Esto es necesario porque el Sidebar utiliza
 * este endpoint para mostrar el nombre real
 * del negocio.
 */

export async function GET() {
  try {
    /*
     * VERIFICAR SESIÓN
     */

    const auth =
      await requireAuth();

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
     * OBTENER CONFIGURACIÓN
     */

    const config =
      await prisma.businessConfig.findFirst();

    return NextResponse.json({
      name:
        config?.name ||
        "ControlStock Pro",

      currency:
        config?.currency ||
        "GTQ",
    });
  } catch (error) {
    console.error(
      "Error obteniendo configuración:",
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