import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";

type Props = {
  searchParams: Promise<{
    q?: string;
    error?: string;
  }>;
};

/*
 * ==========================================
 * ELIMINAR PRODUCTO
 * ==========================================
 */

async function deleteProduct(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede eliminar productos.
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const id = Number(
    formData.get("id")
  );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/productos?error=invalid-product"
    );
  }

  /*
   * Buscar producto y comprobar
   * si ya tiene historial.
   */

  const product =
    await prisma.product.findUnique({
      where: {
        id,
      },

      select: {
        id: true,

        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
            movements: true,
          },
        },
      },
    });

  if (!product) {
    redirect(
      "/productos?error=product-not-found"
    );
  }

  /*
   * No eliminamos productos con historial,
   * para conservar ventas, compras y Kardex.
   */

  const hasHistory =
    product._count.saleItems > 0 ||
    product._count.purchaseItems > 0 ||
    product._count.movements > 0;

  if (hasHistory) {
    redirect(
      "/productos?error=product-has-history"
    );
  }

  try {
    await prisma.product.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    console.error(
      "Error eliminando producto:",
      error
    );

    redirect(
      "/productos?error=delete-error"
    );
  }

  revalidatePath(
    "/productos"
  );

  redirect("/productos");
}

/*
 * ==========================================
 * PÁGINA PRODUCTOS
 * ==========================================
 */

export default async function ProductosPage({
  searchParams,
}: Props) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Los tres roles pueden consultar productos.
   */

  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
      "VIEWER",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params =
    await searchParams;

  const q =
    params.q?.trim() || "";

  /*
   * PERMISOS VISUALES
   */

  const isAdmin =
    auth.session.role ===
    "ADMIN";

  const canExport =
    auth.session.role ===
      "ADMIN" ||
    auth.session.role ===
      "VIEWER";

  /*
   * ==========================================
   * CONSULTAS
   * ==========================================
   */

  const [
    products,
    business,
  ] = await Promise.all([
    prisma.product.findMany({
      where: q
        ? {
            OR: [
              {
                code: {
                  contains: q,
                },
              },

              {
                name: {
                  contains: q,
                },
              },

              {
                brand: {
                  contains: q,
                },
              },

              {
                category: {
                  name: {
                    contains: q,
                  },
                },
              },

              {
                supplier: {
                  name: {
                    contains: q,
                  },
                },
              },
            ],
          }
        : undefined,

      include: {
        category: true,
        supplier: true,

        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
            movements: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.businessConfig.findFirst({
      select: {
        currency: true,
      },
    }),
  ]);

  /*
   * MONEDA
   */

  const currency =
    business?.currency ||
    "GTQ";

  const currencySymbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : "Q";

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Productos
            </h1>

            <p className="text-slate-500">
              Consulta productos, existencias y precios de venta.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* EXPORTACIÓN:
                ADMIN + VIEWER */}
            {canExport && (
              <Link
                href="/api/productos/export"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                <Download
                  size={18}
                />

                Exportar Excel
              </Link>
            )}

            {/* NUEVO PRODUCTO:
                SOLO ADMIN */}
            {isAdmin && (
              <Link
                href="/productos/nuevo"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus
                  size={18}
                />

                Nuevo producto
              </Link>
            )}
          </div>
        </header>

        {/* ======================================
            MENSAJES
        ====================================== */}

        {params.error ===
          "product-has-history" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                El producto tiene historial
              </p>

              <p>
                No se puede eliminar porque ya participa en ventas, compras o movimientos de Kardex. Esto protege la trazabilidad del inventario.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "product-not-found" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Producto no encontrado
              </p>

              <p>
                El producto seleccionado ya no existe.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "invalid-product" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Producto no válido
              </p>

              <p>
                No se pudo identificar correctamente el producto.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "delete-error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                No se pudo eliminar el producto
              </p>

              <p>
                Ocurrió un error inesperado. Revisa la consola del servidor.
              </p>
            </div>
          </div>
        )}

        {/* ======================================
            BUSCADOR
        ====================================== */}

        <section className="mb-6 rounded-2xl bg-white p-5 shadow">
          <form className="flex flex-col gap-3 md:flex-row">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por código, producto, marca, categoría o proveedor..."
              className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              <Search
                size={18}
              />

              Buscar
            </button>

            <Link
              href="/productos"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-center font-semibold text-slate-800 transition hover:bg-slate-300"
            >
              <RotateCcw
                size={18}
              />

              Limpiar
            </Link>
          </form>
        </section>

        {/* ======================================
            TABLA
        ====================================== */}

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4 text-left">
                    Código
                  </th>

                  <th className="p-4 text-left">
                    Producto
                  </th>

                  <th className="p-4 text-left">
                    Categoría
                  </th>

                  <th className="p-4 text-left">
                    Proveedor
                  </th>

                  <th className="p-4 text-right">
                    Stock
                  </th>

                  <th className="p-4 text-right">
                    Precio venta
                  </th>

                  {isAdmin && (
                    <th className="p-4 text-center">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {products.map(
                  (product) => {
                    /*
                     * El producto no debe eliminarse
                     * si ya tiene trazabilidad.
                     */

                    const hasHistory =
                      product._count
                        .saleItems >
                        0 ||
                      product._count
                        .purchaseItems >
                        0 ||
                      product._count
                        .movements >
                        0;

                    return (
                      <tr
                        key={
                          product.id
                        }
                        className="border-b transition hover:bg-slate-50"
                      >
                        {/* CÓDIGO */}
                        <td className="p-4 font-medium">
                          {
                            product.code
                          }
                        </td>

                        {/* PRODUCTO */}
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">
                            {
                              product.name
                            }
                          </p>

                          <p className="text-slate-500">
                            {product.brand ||
                              "Marca no asignada"}
                          </p>
                        </td>

                        {/* CATEGORÍA */}
                        <td className="p-4">
                          {product.category
                            ?.name ||
                            "Categoría no asignada"}
                        </td>

                        {/* PROVEEDOR */}
                        <td className="p-4">
                          {product.supplier
                            ?.name ||
                            "Proveedor no asignado"}
                        </td>

                        {/* STOCK */}
                        <td className="p-4">
                          <div className="flex flex-col items-end gap-1">
                            {product.stock ===
                            0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                <CircleX
                                  size={
                                    13
                                  }
                                />

                                Agotado
                              </span>
                            ) : product.stock <=
                              product.minStock ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                <TriangleAlert
                                  size={
                                    13
                                  }
                                />

                                Stock bajo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                <CircleCheck
                                  size={
                                    13
                                  }
                                />

                                Disponible
                              </span>
                            )}

                            <span className="text-xs font-medium text-slate-500">
                              {
                                product.stock
                              }{" "}
                              unidad
                              {product.stock ===
                              1
                                ? ""
                                : "es"}
                            </span>
                          </div>
                        </td>

                        {/* PRECIO DE VENTA */}
                        <td className="p-4 text-right font-semibold text-slate-900">
                          {
                            currencySymbol
                          }
                          {product.priceSale.toFixed(
                            2
                          )}
                        </td>

                        {/* ACCIONES:
                            SOLO ADMIN */}
                        {isAdmin && (
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex justify-center gap-2">
                                <Link
                                  href={`/productos/${product.id}/editar`}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1 text-xs text-white transition hover:bg-blue-600"
                                >
                                  <Pencil
                                    size={
                                      13
                                    }
                                  />

                                  Editar
                                </Link>

                                <form
                                  action={
                                    deleteProduct
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={
                                      product.id
                                    }
                                  />

                                  <ConfirmDeleteButton
                                    disabled={
                                      hasHistory
                                    }
                                    title="¿Desea eliminar este producto?"
                                    text="Esta acción eliminará el producto del inventario."
                                  />
                                </form>
                              </div>

                              {hasHistory && (
                                <p className="max-w-44 text-center text-xs text-slate-500">
                                  Producto con historial
                                </p>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }
                )}

                {products.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        isAdmin
                          ? 7
                          : 6
                      }
                      className="p-8 text-center text-slate-500"
                    >
                      No se encontraron productos que coincidan con los criterios de búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}