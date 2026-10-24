import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

import {
  BadgeCheck,
  CircleAlert,
  ClipboardPen,
  Hash,
  Package,
  RefreshCcw,
  SlidersHorizontal,
} from "lucide-react";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

/*
 * ==========================================
 * MOTIVOS PERMITIDOS
 * ==========================================
 */

const INCREASE_REASONS = [
  "Conteo físico",
  "Corrección de inventario",
  "Mercancía encontrada",
  "OTRO",
];

const DECREASE_REASONS = [
  "Conteo físico",
  "Producto dañado",
  "Pérdida o extravío",
  "Corrección de inventario",
  "OTRO",
];

/*
 * ==========================================
 * CREAR AJUSTE
 * ==========================================
 */

async function createAdjustment(
  formData: FormData
) {
  "use server";

  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
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

  const direction = String(
    formData.get("direction") || ""
  ).trim();

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
   * VALIDACIONES GENERALES
   * ==========================================
   */

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !["INCREASE", "DECREASE"].includes(
      direction
    ) ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !reasonType
  ) {
    redirect(
      "/ajustes?error=invalid-data"
    );
  }

  /*
   * ==========================================
   * VALIDAR MOTIVO SEGÚN DIRECCIÓN
   * ==========================================
   */

  const allowedReasons =
    direction === "INCREASE"
      ? INCREASE_REASONS
      : DECREASE_REASONS;

  if (
    !allowedReasons.includes(
      reasonType
    )
  ) {
    redirect(
      "/ajustes?error=invalid-reason"
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
      "/ajustes?error=reason-required"
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
         * PRODUCTO
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
         * STOCK ACTUAL
         */

        const previousStock =
          product.stock;

        /*
         * EVITAR STOCK NEGATIVO
         */

        if (
          direction ===
            "DECREASE" &&
          previousStock < quantity
        ) {
          throw new Error(
            "INSUFFICIENT_STOCK"
          );
        }

        /*
         * CANTIDAD CON SIGNO
         */

        const signedQuantity =
          direction === "INCREASE"
            ? quantity
            : -quantity;

        const newStock =
          previousStock +
          signedQuantity;

        /*
         * ======================================
         * ACTUALIZAR STOCK
         * ======================================
         *
         * La condición stock = previousStock
         * ayuda a detectar modificaciones
         * concurrentes.
         */

        const updatedProduct =
          await tx.product.updateMany({
            where: {
              id: product.id,

              stock:
                previousStock,
            },

            data: {
              stock:
                newStock,
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
              "AJUSTE",

            quantity:
              signedQuantity,

            previousStock,

            newStock,

            reason,
          },
        });
      }
    );
  } catch (error) {
    /*
     * PRODUCTO INEXISTENTE
     */

    if (
      error instanceof Error &&
      error.message ===
        "PRODUCT_NOT_FOUND"
    ) {
      redirect(
        "/ajustes?error=product-not-found"
      );
    }

    /*
     * STOCK INSUFICIENTE
     */

    if (
      error instanceof Error &&
      error.message ===
        "INSUFFICIENT_STOCK"
    ) {
      redirect(
        "/ajustes?error=stock"
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
        "/ajustes?error=stock-changed"
      );
    }

    console.error(
      "Error al registrar ajuste:",
      error
    );

    redirect(
      "/ajustes?error=server-error"
    );
  }

  redirect(
    "/ajustes?success=adjustment-created"
  );
}

/*
 * ==========================================
 * PÁGINA
 * ==========================================
 */

export default async function AjustesPage({
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
    recentAdjustments,
  ] = await Promise.all([
    prisma.product.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.inventoryMovement.findMany({
      where: {
        type: "AJUSTE",
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
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">
            <SlidersHorizontal
              size={17}
            />

            <span>
              Control de inventario
            </span>
          </div>

          <h1 className="text-4xl font-bold text-slate-900">
            Ajustes de inventario
          </h1>

          <p className="mt-1 text-slate-600">
            Corrige diferencias entre el inventario físico y el stock registrado.
          </p>
        </header>

        {/* ÉXITO */}
        {params.success ===
          "adjustment-created" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <BadgeCheck
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Ajuste registrado correctamente
              </p>

              <p>
                El stock fue actualizado y el movimiento quedó guardado en el Kardex.
              </p>
            </div>
          </div>
        )}

        {/* ERROR DATOS */}
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
                Selecciona un producto, un tipo de ajuste, una cantidad mayor que cero y un motivo.
              </p>
            </div>
          </div>
        )}

        {/* ERROR MOTIVO NO PERMITIDO */}
        {params.error ===
          "invalid-reason" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Motivo no válido para este ajuste
              </p>

              <p>
                El motivo seleccionado no corresponde al tipo de ajuste que deseas realizar.
              </p>
            </div>
          </div>
        )}

        {/* ERROR OTRO */}
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

        {/* ERROR PRODUCTO */}
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

        {/* ERROR STOCK */}
        {params.error ===
          "stock" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Stock insuficiente
              </p>

              <p>
                No puedes disminuir una cantidad mayor al stock disponible.
              </p>
            </div>
          </div>
        )}

        {/* ERROR CONCURRENCIA */}
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
                Otro movimiento modificó el inventario. Intenta registrar el ajuste nuevamente.
              </p>
            </div>
          </div>
        )}

        {/* ERROR SERVIDOR */}
        {params.error ===
          "server-error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                No se pudo registrar el ajuste
              </p>

              <p>
                Ocurrió un error inesperado. Revisa la consola del servidor.
              </p>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* FORMULARIO */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="border-b border-slate-100 bg-slate-50 px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <ClipboardPen
                    size={21}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Registrar ajuste
                  </h2>

                  <p className="text-sm text-slate-500">
                    Aumenta o disminuye el stock por una corrección real de inventario.
                  </p>
                </div>
              </div>
            </div>

            <form
              action={
                createAdjustment
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

              {/* DIRECCIÓN */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <RefreshCcw
                    size={17}
                  />

                  Tipo de ajuste
                </label>

                <select
                  name="direction"
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-slate-900"
                  required
                >
                  <option value="">
                    Seleccione una opción
                  </option>

                  <option value="INCREASE">
                    Aumentar stock
                  </option>

                  <option value="DECREASE">
                    Disminuir stock
                  </option>
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
                  placeholder="Ej: 5"
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              {/* MOTIVO */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
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

                  <option value="Conteo físico">
                    Conteo físico
                  </option>

                  <option value="Producto dañado">
                    Producto dañado
                  </option>

                  <option value="Pérdida o extravío">
                    Pérdida o extravío
                  </option>

                  <option value="Corrección de inventario">
                    Corrección de inventario
                  </option>

                  <option value="Mercancía encontrada">
                    Mercancía encontrada
                  </option>

                  <option value="OTRO">
                    Otro
                  </option>
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Producto dañado y pérdida se utilizan para disminuciones. Mercancía encontrada se utiliza para aumentos.
                </p>
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
              <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 md:col-span-2">
                <BadgeCheck
                  className="mt-0.5 shrink-0"
                  size={20}
                />

                <div>
                  <p className="font-semibold">
                    Ajuste con trazabilidad
                  </p>

                  <p>
                    El cambio de stock y el movimiento del Kardex se guardarán dentro de una sola transacción.
                  </p>
                </div>
              </div>

              {/* ADVERTENCIA */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 md:col-span-2">
                <p className="font-semibold">
                  Utiliza Ajustes únicamente para corregir inventario
                </p>

                <p className="mt-1">
                  Las compras deben registrarse en Compras, las ventas en Ventas y los ingresos extraordinarios en Entradas.
                </p>
              </div>

              {/* BOTÓN */}
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
              >
                <SlidersHorizontal
                  size={19}
                />

                Registrar ajuste
              </button>
            </form>
          </div>

          {/* ÚLTIMOS AJUSTES */}
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <RefreshCcw
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Últimos ajustes
                </h2>

                <p className="text-sm text-slate-500">
                  Correcciones recientes del inventario.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {recentAdjustments.map(
                (adjustment) => (
                  <div
                    key={
                      adjustment.id
                    }
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {
                            adjustment
                              .product
                              .name
                          }
                        </p>

                        <p className="text-xs text-slate-500">
                          Código:{" "}
                          {
                            adjustment
                              .product
                              .code
                          }
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          adjustment.quantity >
                          0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {adjustment.quantity >
                        0
                          ? "+"
                          : ""}
                        {
                          adjustment.quantity
                        }
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      {adjustment.reason ||
                        "Sin motivo registrado"}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Stock:{" "}
                        {
                          adjustment.previousStock
                        }{" "}
                        →{" "}
                        {
                          adjustment.newStock
                        }
                      </span>

                      <span>
                        {new Date(
                          adjustment.createdAt
                        ).toLocaleString(
                          "es-GT"
                        )}
                      </span>
                    </div>
                  </div>
                )
              )}

              {recentAdjustments.length ===
                0 && (
                <div className="py-10 text-center">
                  <RefreshCcw
                    className="mx-auto mb-3 text-slate-300"
                    size={38}
                  />

                  <p className="font-semibold text-slate-700">
                    Sin ajustes registrados
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Los nuevos ajustes aparecerán aquí.
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