import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/*
 * ==========================================
 * EXPORTAR PRODUCTOS A EXCEL
 * ==========================================
 *
 * Permitido para:
 * - ADMIN
 * - VIEWER
 *
 * SELLER no puede exportar el catálogo completo
 * porque el archivo contiene información sensible
 * como precio de costo.
 */

export async function GET() {
  try {
    /*
     * VALIDAR PERMISOS
     */

    const auth =
      await requireRole([
        "ADMIN",
        "VIEWER",
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
     * OBTENER PRODUCTOS
     */

    const products =
      await prisma.product.findMany({
        include: {
          category: true,
          supplier: true,
        },

        orderBy: {
          name: "asc",
        },
      });

    /*
     * PREPARAR DATOS
     */

    const data = products.map(
      (product) => ({
        Código: product.code,
        Producto: product.name,
        Marca:
          product.brand || "",
        Categoría:
          product.category?.name || "",
        Proveedor:
          product.supplier?.name || "",
        "Precio costo":
          product.priceCost,
        "Precio venta":
          product.priceSale,
        Stock: product.stock,
        "Stock mínimo":
          product.minStock,
        Descripción:
          product.description || "",
      })
    );

    /*
     * CREAR EXCEL
     */

    const worksheet =
      XLSX.utils.json_to_sheet(
        data
      );

    /*
     * ANCHOS DE COLUMNAS
     */

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 22 },
      { wch: 24 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 40 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Productos"
    );

    const buffer = XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
      }
    );

    /*
     * RESPUESTA
     */

    return new NextResponse(
      buffer,
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="productos-stockpro.xlsx"',

          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error exportando productos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo exportar el catálogo de productos.",
      },
      {
        status: 500,
      }
    );
  }
}