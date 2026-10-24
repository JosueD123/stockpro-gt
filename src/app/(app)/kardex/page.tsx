import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { redirect } from "next/navigation";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Package,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";

type Props = {
  searchParams: Promise<{
    type?: string;
    q?: string;
  }>;
};

export default async function KardexPage({
  searchParams,
}: Props) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Kardex es únicamente de consulta.
   *
   * Pueden acceder:
   * - ADMIN
   * - SELLER
   * - VIEWER
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

  const type =
    params.type || "";

  const q =
    params.q?.trim() || "";

  /*
   * ==========================================
   * MOVIMIENTOS
   * ==========================================
   */

  const movements =
    await prisma.inventoryMovement.findMany({
      where: {
        ...(type
          ? {
              type,
            }
          : {}),

        ...(q
          ? {
              product: {
                OR: [
                  {
                    name: {
                      contains: q,
                    },
                  },
                  {
                    code: {
                      contains: q,
                    },
                  },
                  {
                    brand: {
                      contains: q,
                    },
                  },
                ],
              },
            }
          : {}),
      },

      include: {
        product: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  /*
   * ==========================================
   * TOTALES
   * ==========================================
   */

  const totals =
    movements.reduce(
      (
        accumulator,
        movement
      ) => {
        if (
          movement.quantity >
          0
        ) {
          accumulator.entries +=
            movement.quantity;
        }

        if (
          movement.quantity <
          0
        ) {
          accumulator.exits +=
            Math.abs(
              movement.quantity
            );
        }

        return accumulator;
      },
      {
        entries: 0,
        exits: 0,
      }
    );

  /*
   * ==========================================
   * ESTILOS DEL MOVIMIENTO
   * ==========================================
   */

  function getMovementStyles(
    movementType: string
  ) {
    switch (movementType) {
      case "VENTA":
        return {
          label: "Venta",
          icon: ShoppingCart,
          badgeClass:
            "bg-red-100 text-red-700",
          iconClass:
            "bg-red-100 text-red-700",
        };

      case "ENTRADA":
        return {
          label: "Entrada",
          icon: ArrowUpCircle,
          badgeClass:
            "bg-green-100 text-green-700",
          iconClass:
            "bg-green-100 text-green-700",
        };

      case "SALIDA":
        return {
          label: "Salida",
          icon: ArrowDownCircle,
          badgeClass:
            "bg-orange-100 text-orange-700",
          iconClass:
            "bg-orange-100 text-orange-700",
        };

      case "AJUSTE":
        return {
          label: "Ajuste",
          icon: RefreshCcw,
          badgeClass:
            "bg-blue-100 text-blue-700",
          iconClass:
            "bg-blue-100 text-blue-700",
        };

      case "COMPRA":
        return {
          label: "Compra",
          icon: ArrowUpCircle,
          badgeClass:
            "bg-cyan-100 text-cyan-700",
          iconClass:
            "bg-cyan-100 text-cyan-700",
        };

      default:
        return {
          label: movementType,
          icon: History,
          badgeClass:
            "bg-slate-100 text-slate-700",
          iconClass:
            "bg-slate-100 text-slate-700",
        };
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <History size={17} />

            <span>
              Control de inventario
            </span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Kardex de inventario
          </h1>

          <p className="text-slate-500">
            Consulta el historial de entradas, compras, ventas, salidas y ajustes de stock.
          </p>
        </header>

        {/* RESUMEN */}
        <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Movimientos registrados
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <History
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-slate-900">
              {movements.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Unidades de entrada
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <ArrowUpCircle
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-green-700">
              +{totals.entries}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Unidades de salida
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <ArrowDownCircle
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-red-700">
              -{totals.exits}
            </p>
          </div>
        </section>

        {/* FILTROS */}
        <section className="mb-6 rounded-2xl bg-white p-5 shadow">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por producto, código o marca..."
              className="rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
            />

            <select
              name="type"
              defaultValue={type}
              className="rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">
                Todos los movimientos
              </option>

              <option value="VENTA">
                Ventas
              </option>

              <option value="COMPRA">
                Compras
              </option>

              <option value="ENTRADA">
                Entradas
              </option>

              <option value="SALIDA">
                Salidas
              </option>

              <option value="AJUSTE">
                Ajustes
              </option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Filtrar
            </button>
          </form>
        </section>

        {/* TABLA */}
        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-left">
                  Fecha
                </th>

                <th className="p-4 text-left">
                  Producto
                </th>

                <th className="p-4 text-center">
                  Tipo
                </th>

                <th className="p-4 text-right">
                  Cantidad
                </th>

                <th className="p-4 text-center">
                  Stock
                </th>

                <th className="p-4 text-left">
                  Motivo
                </th>
              </tr>
            </thead>

            <tbody>
              {movements.map(
                (movement) => {
                  const movementStyle =
                    getMovementStyles(
                      movement.type
                    );

                  const Icon =
                    movementStyle.icon;

                  return (
                    <tr
                      key={
                        movement.id
                      }
                      className="border-b transition hover:bg-slate-50"
                    >
                      <td className="p-4">
                        {new Date(
                          movement.createdAt
                        ).toLocaleString(
                          "es-GT"
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${movementStyle.iconClass}`}
                          >
                            <Icon
                              size={
                                18
                              }
                            />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {
                                movement
                                  .product
                                  .name
                              }
                            </p>

                            <p className="text-xs text-slate-500">
                              Código:{" "}
                              {
                                movement
                                  .product
                                  .code
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${movementStyle.badgeClass}`}
                        >
                          {
                            movementStyle.label
                          }
                        </span>
                      </td>

                      <td
                        className={`p-4 text-right font-bold ${
                          movement.quantity >
                          0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {movement.quantity >
                        0
                          ? "+"
                          : ""}
                        {
                          movement.quantity
                        }
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
                          <span className="font-medium text-slate-500">
                            {
                              movement.previousStock
                            }
                          </span>

                          <span className="text-slate-400">
                            →
                          </span>

                          <span className="font-bold text-slate-900">
                            {
                              movement.newStock
                            }
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-700">
                          {movement.reason ||
                            "Sin motivo registrado"}
                        </p>

                        {movement.referenceId && (
                          <p className="mt-1 text-xs text-slate-500">
                            Referencia #
                            {
                              movement.referenceId
                            }
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                }
              )}

              {movements.length ===
                0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-slate-500"
                  >
                    <Package
                      className="mx-auto mb-3 text-slate-300"
                      size={38}
                    />

                    <p className="font-semibold text-slate-700">
                      No se encontraron movimientos
                    </p>

                    <p className="mt-1 text-sm">
                      Los movimientos de inventario aparecerán aquí.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}