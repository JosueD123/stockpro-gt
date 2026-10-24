import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

import {
  ArrowDownToLine,
  BadgeCheck,
  Boxes,
  CircleAlert,
  ClipboardList,
  Hash,
  Package,
  PlusCircle,
} from "lucide-react";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

/*
 * ==========================================
 * MOTIVOS PERMITIDOS PARA ENTRADAS
 * ==========================================
 *
 * Las compras a proveedores deben registrarse
 * exclusivamente desde el módulo Compras.
 */

const ALLOWED_ENTRY_REASONS = [
  "Devolución de cliente",
  "Inventario inicial",
  "Ajuste positivo",
  "OTRO",
];

/*
 * ==========================================
 * CREAR ENTRADA
 * ==========================================
 */

async function createEntry(
  formData: FormData
) {
  "use server";

  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Solo ADMIN puede registrar entradas.
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  /*
   * ==========================================
   * DATOS
   * ==========================================
   */

  const productId = Number(
    formData.get("productId")
  );

  const quantity = Number(
    formData.get("quantity")
  );

  const reasonType = String(
    formData.get("reasonType") || ""
  ).trim();

  const customReason = String(
    formData.get("customReason") || ""
  ).trim();

  /*
   * ==========================================
   * VALIDACIONES BÁSICAS
   * ==========================================
   */

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !reasonType
  ) {
    redirect(
      "/entradas?error=invalid-data"
    );
  }

  /*
   * ==========================================
   * VALIDAR MOTIVO
   * ==========================================
   *
   * Esto evita que alguien manipule
   * manualmente el formulario e intente
   * enviar un motivo no permitido.
   */

  if (
    !ALLOWED_ENTRY_REASONS.includes(
      reasonType
    )
  ) {
    redirect(
      "/entradas?error=invalid-reason"
    );
  }

  /*
   * ==========================================
   * MOTIVO DEFINITIVO
   * ==========================================
   */

  const reason =
    reasonType === "OTRO"
      ? customReason
      : reasonType;

  if (!reason) {
    redirect(
      "/entradas?error=reason-required"
    );
  }

  /*
   * ==========================================
   * TRANSACCIÓN
   * ==========================================
   */

  try {
    await prisma.$transaction(
      async (tx) => {
        /*
         * OBTENER PRODUCTO
         */

        const product =
          await tx.product.findUnique({
            where: {
              id: productId,
            },
          });

        if (!product) {
          throw new Error(
            "PRODUCT_NOT_FOUND"
          );
        }

        /*
         * STOCK
         */

        const previousStock =
          product.stock;

        const newStock =
          previousStock +
          quantity;

        /*
         * ======================================
         * ACTUALIZAR STOCK
         * ======================================
         *
         * Solo actualizamos si el stock sigue
         * siendo exactamente el mismo que
         * acabamos de leer.
         */

        const updatedProduct =
          await tx.product.updateMany({
            where: {
              id: product.id,

              stock:
                previousStock,
            },

            data: {
              stock: {
                increment:
                  quantity,
              },
            },
          });

        if (
          updatedProduct.count ===
          0
        ) {
          throw new Error(
            "STOCK_CHANGED"
          );
        }

        /*
         * ======================================
         * KARDEX
         * ======================================
         */

        await tx.inventoryMovement.create({
          data: {
            productId:
              product.id,

            type:
              "ENTRADA",

            quantity,

            previousStock,

            newStock,

            reason,
          },
        });
      }
    );
  } catch (error) {
    /*
     * PRODUCTO
     */

    if (
      error instanceof Error &&
      error.message ===
        "PRODUCT_NOT_FOUND"
    ) {
      redirect(
        "/entradas?error=product-not-found"
      );
    }

    /*
     * CONCURRENCIA
     */

    if (
      error instanceof Error &&
      error.message ===
        "STOCK_CHANGED"
    ) {
      redirect(
        "/entradas?error=stock-changed"
      );
    }

    console.error(
      "Error al registrar entrada:",
      error
    );

    redirect(
      "/entradas?error=server-error"
    );
  }

  redirect(
    "/entradas?success=entry-created"
  );
}

/*
 * ==========================================
 * PÁGINA
 * ==========================================
 */

export default async function EntradasPage({
  searchParams,
}: Props) {
  /*
   * ==========================================
   * SEGURIDAD DE LA PÁGINA
   * ==========================================
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params =
    await searchParams;

  /*
   * ==========================================
   * DATOS
   * ==========================================
   */

  const [
    products,
    recentEntries,
  ] = await Promise.all([
    prisma.product.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.inventoryMovement.findMany({
      where: {
        type: "ENTRADA",
      },

      include: {
        product: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 8,
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-6xl">
        {/* ENCABEZADO */}
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <ArrowDownToLine
              size={17}
            />

            <span>
              Control de inventario
            </span>
          </div>

          <h1 className="text-4xl font-bold text-slate-900">
            Entradas de inventario
          </h1>

          <p className="mt-1 text-slate-600">
            Registra ingresos de mercancía que no correspondan a compras a proveedores.
          </p>
        </header>

        {/* ÉXITO */}
        {params.success ===
          "entry-created" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <BadgeCheck
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Entrada registrada correctamente
              </p>

              <p>
                El stock fue actualizado y el movimiento quedó guardado en el Kardex.
              </p>
            </div>
          </div>
        )}

        {/* ERROR: DATOS */}
        {params.error ===
          "invalid-data" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Datos no válidos
              </p>

              <p>
                Selecciona un producto, una cantidad mayor que cero y un motivo.
              </p>
            </div>
          </div>
        )}

        {/* ERROR: MOTIVO NO PERMITIDO */}
        {params.error ===
          "invalid-reason" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Motivo no permitido
              </p>

              <p>
                Las compras a proveedores deben registrarse desde el módulo Compras.
              </p>
            </div>
          </div>
        )}

        {/* ERROR: DESCRIPCIÓN */}
        {params.error ===
          "reason-required" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Motivo obligatorio
              </p>

              <p>
                Escribe una descripción cuando selecciones la opción “Otro”.
              </p>
            </div>
          </div>
        )}

        {/* ERROR: PRODUCTO */}
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
                El producto seleccionado no existe o fue eliminado.
              </p>
            </div>
          </div>
        )}

        {/* ERROR: STOCK CAMBIÓ */}
        {params.error ===
          "stock-changed" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                El stock cambió durante la operación
              </p>

              <p>
                Intenta registrar la entrada nuevamente.
              </p>
            </div>
          </div>
        )}

        {/* ERROR: SERVIDOR */}
        {params.error ===
          "server-error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                No se pudo registrar la entrada
              </p>

              <p>
                Ocurrió un error inesperado. Revisa la consola del servidor.
              </p>
            </div>
          </div>
        )}

        {/* CONTENIDO */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* FORMULARIO */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="border-b border-slate-100 bg-slate-50 px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <PlusCircle
                    size={21}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Registrar nueva entrada
                  </h2>

                  <p className="text-sm text-slate-500">
                    Selecciona un producto e indica la cantidad recibida.
                  </p>
                </div>
              </div>
            </div>

            <form
              action={
                createEntry
              }
              className="grid grid-cols-1 gap-6 p-8 md:grid-cols-2"
            >
              {/* PRODUCTO */}
              <div className="md:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Package
                    size={17}
                  />

                  Producto
                </label>

                <select
                  name="productId"
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-slate-900"
                  required
                >
                  <option value="">
                    Seleccione un producto
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >
                        {product.name} | Código:{" "}
                        {product.code} | Stock actual:{" "}
                        {product.stock}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* CANTIDAD */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Hash
                    size={17}
                  />

                  Cantidad
                </label>

                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej: 25"
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              {/* MOTIVO */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ClipboardList
                    size={17}
                  />

                  Motivo
                </label>

                <select
                  name="reasonType"
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-slate-900"
                  required
                >
                  <option value="">
                    Seleccione un motivo
                  </option>

                  <option value="Devolución de cliente">
                    Devolución de cliente
                  </option>

                  <option value="Inventario inicial">
                    Inventario inicial
                  </option>

                  <option value="Ajuste positivo">
                    Ajuste positivo
                  </option>

                  <option value="OTRO">
                    Otro
                  </option>
                </select>
              </div>

              {/* DESCRIPCIÓN */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Descripción adicional
                </label>

                <textarea
                  name="customReason"
                  placeholder="Escribe aquí el motivo cuando selecciones Otro..."
                  className="min-h-28 w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* INFORMACIÓN */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 md:col-span-2">
                <BadgeCheck
                  className="mt-0.5 shrink-0"
                  size={20}
                />

                <div>
                  <p className="font-semibold">
                    Actualización automática
                  </p>

                  <p>
                    El sistema aumentará el stock y guardará el movimiento en el Kardex dentro de una sola transacción.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 md:col-span-2">
                <p className="font-semibold">
                  Importante
                </p>

                <p className="mt-1">
                  Si la mercancía corresponde a una compra realizada a un proveedor, utiliza el módulo Compras para mantener correctamente proveedor, costo, historial y trazabilidad.
                </p>
              </div>

              {/* BOTÓN */}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
              >
                <ArrowDownToLine
                  size={19}
                />

                Registrar entrada
              </button>
            </form>
          </div>

          {/* ÚLTIMAS ENTRADAS */}
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Boxes
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Últimas entradas
                </h2>

                <p className="text-sm text-slate-500">
                  Movimientos recientes registrados.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {recentEntries.map(
                (entry) => (
                  <div
                    key={
                      entry.id
                    }
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {
                            entry
                              .product
                              .name
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          Código:{" "}
                          {
                            entry
                              .product
                              .code
                          }
                        </p>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        +
                        {
                          entry.quantity
                        }
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {entry.reason ||
                        "Sin motivo registrado"}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Stock:{" "}
                        {
                          entry.previousStock
                        }{" "}
                        →{" "}
                        {
                          entry.newStock
                        }
                      </span>

                      <span>
                        {new Date(
                          entry.createdAt
                        ).toLocaleString(
                          "es-GT"
                        )}
                      </span>
                    </div>
                  </div>
                )
              )}

              {recentEntries.length ===
                0 && (
                <div className="py-10 text-center">
                  <Boxes
                    className="mx-auto mb-3 text-slate-300"
                    size={38}
                  />

                  <p className="font-semibold text-slate-700">
                    Sin entradas registradas
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Las nuevas entradas aparecerán aquí.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}