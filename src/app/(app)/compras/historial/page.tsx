import Link from "next/link";
import { redirect } from "next/navigation";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Filter,
  Package,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    supplierId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

function formatMoney(
  value: number,
  currencySymbol: string
) {
  return `${currencySymbol}${value.toLocaleString(
    "es-GT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "es-GT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(value);
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "COMPLETED":
      return "Completada";

    case "PENDING":
      return "Pendiente";

    case "CANCELLED":
      return "Anulada";

    default:
      return status;
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "COMPLETED":
      return "border-green-200 bg-green-100 text-green-700";

    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-700";

    case "CANCELLED":
      return "border-red-200 bg-red-100 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function createPageUrl(
  page: number,
  filters: {
    q: string;
    supplierId: string;
    status: string;
    from: string;
    to: string;
  }
) {
  const params =
    new URLSearchParams();

  if (filters.q) {
    params.set(
      "q",
      filters.q
    );
  }

  if (
    filters.supplierId
  ) {
    params.set(
      "supplierId",
      filters.supplierId
    );
  }

  if (filters.status) {
    params.set(
      "status",
      filters.status
    );
  }

  if (filters.from) {
    params.set(
      "from",
      filters.from
    );
  }

  if (filters.to) {
    params.set(
      "to",
      filters.to
    );
  }

  params.set(
    "page",
    String(page)
  );

  return `/compras/historial?${params.toString()}`;
}

export default async function PurchaseHistoryPage({
  searchParams,
}: PageProps) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Historial de compras:
   * solamente ADMIN.
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

  const q = String(
    params.q || ""
  ).trim();

  const supplierIdValue =
    String(
      params.supplierId ||
        ""
    ).trim();

  const status = String(
    params.status || ""
  ).trim();

  const from = String(
    params.from || ""
  ).trim();

  const to = String(
    params.to || ""
  ).trim();

  const requestedPage =
    Number(
      params.page || "1"
    );

  const currentPage =
    Number.isInteger(
      requestedPage
    ) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const supplierId =
    Number(
      supplierIdValue
    );

  /*
   * ==========================================
   * FILTROS
   * ==========================================
   */

  const where: Prisma.PurchaseWhereInput =
    {};

  if (q) {
    where.OR = [
      {
        purchaseNumber: {
          contains: q,
        },
      },

      {
        supplier: {
          name: {
            contains: q,
          },
        },
      },
    ];
  }

  if (
    supplierIdValue &&
    Number.isInteger(
      supplierId
    ) &&
    supplierId > 0
  ) {
    where.supplierId =
      supplierId;
  }

  if (
    status ===
      "COMPLETED" ||
    status ===
      "PENDING" ||
    status ===
      "CANCELLED"
  ) {
    where.status =
      status;
  }

  const purchaseDateFilter: Prisma.DateTimeFilter =
    {};

  if (from) {
    const fromDate =
      new Date(
        `${from}T00:00:00`
      );

    if (
      !Number.isNaN(
        fromDate.getTime()
      )
    ) {
      purchaseDateFilter.gte =
        fromDate;
    }
  }

  if (to) {
    const toDate =
      new Date(
        `${to}T23:59:59.999`
      );

    if (
      !Number.isNaN(
        toDate.getTime()
      )
    ) {
      purchaseDateFilter.lte =
        toDate;
    }
  }

  if (
    purchaseDateFilter.gte ||
    purchaseDateFilter.lte
  ) {
    where.purchaseDate =
      purchaseDateFilter;
  }

  /*
   * ==========================================
   * CONSULTAS GENERALES
   * ==========================================
   */

  const [
    suppliers,
    totalRecords,
    totals,
    businessConfig,
  ] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
      },
    }),

    prisma.purchase.count({
      where,
    }),

    prisma.purchase.aggregate({
      where,

      _sum: {
        total: true,
      },
    }),

    prisma.businessConfig.findFirst({
      select: {
        currency: true,
      },
    }),
  ]);

  /*
   * ==========================================
   * PAGINACIÓN
   * ==========================================
   */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRecords /
          PAGE_SIZE
      )
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages
    );

  const purchases =
    await prisma.purchase.findMany({
      where,

      include: {
        supplier: true,

        items: {
          select: {
            id: true,
            quantity: true,
          },
        },
      },

      orderBy: [
        {
          purchaseDate:
            "desc",
        },

        {
          createdAt:
            "desc",
        },
      ],

      skip:
        (safePage - 1) *
        PAGE_SIZE,

      take:
        PAGE_SIZE,
    });

  /*
   * ==========================================
   * MONEDA
   * ==========================================
   */

  const currency =
    businessConfig?.currency ||
    "GTQ";

  const currencySymbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : "Q";

  /*
   * ==========================================
   * MÉTRICAS
   * ==========================================
   */

  const totalAmount =
    totals._sum.total ||
    0;

  const currentPageUnits =
    purchases.reduce(
      (
        accumulator,
        purchase
      ) =>
        accumulator +
        purchase.items.reduce(
          (
            itemAccumulator,
            item
          ) =>
            itemAccumulator +
            item.quantity,
          0
        ),
      0
    );

  const filters = {
    q,
    supplierId:
      supplierIdValue,
    status,
    from,
    to,
  };

  const startRecord =
    totalRecords === 0
      ? 0
      : (safePage - 1) *
          PAGE_SIZE +
        1;

  const endRecord =
    Math.min(
      safePage *
        PAGE_SIZE,
      totalRecords
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8">
          <Link
            href="/compras"
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
          >
            <ArrowLeft
              size={17}
            />

            Volver a compras
          </Link>

          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <ShoppingBag
              size={17}
            />

            <span>
              Consultas y abastecimiento
            </span>
          </div>

          <h1 className="text-4xl font-bold text-slate-900">
            Historial de compras
          </h1>

          <p className="mt-2 text-slate-600">
            Consulta todas las compras registradas y filtra las operaciones por número, proveedor, fecha o estado.
          </p>
        </header>

        {/* MÉTRICAS */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Compras encontradas
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    totalRecords
                  }
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ReceiptText
                  size={23}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Valor encontrado
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatMoney(
                    totalAmount,
                    currencySymbol
                  )}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <CircleDollarSign
                  size={23}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Unidades en esta página
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    currentPageUnits
                  }
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Package
                  size={23}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Página actual
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    safePage
                  }

                  <span className="text-lg text-slate-400">
                    /
                    {
                      totalPages
                    }
                  </span>
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CalendarDays
                  size={23}
                />
              </div>
            </div>
          </div>
        </section>

        {/* FILTROS */}
        <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Filter
                  size={19}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Filtros de búsqueda
                </h2>

                <p className="text-sm text-slate-500">
                  Combina uno o varios filtros para encontrar una compra.
                </p>
              </div>
            </div>
          </div>

          <form
            method="GET"
            className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-5"
          >
            <div className="xl:col-span-2">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Número o proveedor
              </label>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={
                    q
                  }
                  placeholder="Ejemplo: CP-00001 o nombre..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="supplierId"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Proveedor
              </label>

              <select
                id="supplierId"
                name="supplierId"
                defaultValue={
                  supplierIdValue
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">
                  Todos los proveedores
                </option>

                {suppliers.map(
                  (
                    supplier
                  ) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {
                        supplier.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Estado
              </label>

              <select
                id="status"
                name="status"
                defaultValue={
                  status
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">
                  Todos los estados
                </option>

                <option value="COMPLETED">
                  Completada
                </option>

                <option value="PENDING">
                  Pendiente
                </option>

                <option value="CANCELLED">
                  Anulada
                </option>
              </select>
            </div>

            <div className="hidden xl:block" />

            <div>
              <label
                htmlFor="from"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Fecha desde
              </label>

              <input
                id="from"
                name="from"
                type="date"
                defaultValue={
                  from
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="to"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Fecha hasta
              </label>

              <input
                id="to"
                name="to"
                type="date"
                defaultValue={
                  to
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:flex-none"
              >
                <Search
                  size={17}
                />

                Buscar compras
              </button>

              <Link
                href="/compras/historial"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:flex-none"
              >
                <RotateCcw
                  size={17}
                />

                Limpiar
              </Link>
            </div>
          </form>
        </section>

        {/* RESULTADOS */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-md">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Compras registradas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Mostrando{" "}
                {
                  startRecord
                }
                –
                {
                  endRecord
                }{" "}
                de{" "}
                {
                  totalRecords
                }{" "}
                resultados.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <Truck
                size={17}
              />

              Ordenadas de la más reciente a la más antigua
            </div>
          </div>

          {purchases.length >
          0 ? (
            <>
              {/* ESCRITORIO */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Número
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Proveedor
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Fecha
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Productos
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                        Total
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Estado
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {purchases.map(
                      (
                        purchase
                      ) => (
                        <tr
                          key={
                            purchase.id
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {
                                purchase.purchaseNumber
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Truck
                                size={
                                  16
                                }
                                className="shrink-0 text-slate-400"
                              />

                              <p className="text-sm text-slate-700">
                                {
                                  purchase.supplier.name
                                }
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatDate(
                              purchase.purchaseDate
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                              {
                                purchase.items.length
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-slate-900">
                            {formatMoney(
                              purchase.total,
                              currencySymbol
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                                purchase.status
                              )}`}
                            >
                              {getStatusLabel(
                                purchase.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/compras/${purchase.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                <Eye
                                  size={
                                    15
                                  }
                                />

                                Ver detalle
                              </Link>

                              <Link
                                href={`/compras/${purchase.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                              >
                                <Printer
                                  size={
                                    15
                                  }
                                />

                                Imprimir
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* MÓVIL */}
              <div className="divide-y divide-slate-200 lg:hidden">
                {purchases.map(
                  (
                    purchase
                  ) => (
                    <article
                      key={
                        purchase.id
                      }
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">
                            {
                              purchase.purchaseNumber
                            }
                          </p>

                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                            <Truck
                              size={
                                15
                              }
                            />

                            {
                              purchase.supplier.name
                            }
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                            purchase.status
                          )}`}
                        >
                          {getStatusLabel(
                            purchase.status
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Fecha
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatDate(
                              purchase.purchaseDate
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Productos
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {
                              purchase.items.length
                            }
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Total
                          </p>

                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatMoney(
                              purchase.total,
                              currencySymbol
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Link
                          href={`/compras/${purchase.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Eye
                            size={
                              16
                            }
                          />

                          Ver detalle
                        </Link>

                        <Link
                          href={`/compras/${purchase.id}`}
                          target="_blank"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                        >
                          <Printer
                            size={
                              16
                            }
                          />

                          Imprimir
                        </Link>
                      </div>
                    </article>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="px-6 py-20 text-center">
              <ReceiptText
                className="mx-auto mb-4 text-slate-300"
                size={54}
              />

              <h3 className="text-lg font-bold text-slate-800">
                No se encontraron compras
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No existen compras que coincidan con los filtros seleccionados. Prueba cambiando los criterios de búsqueda.
              </p>

              <Link
                href="/compras/historial"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <RotateCcw
                  size={17}
                />

                Mostrar todas
              </Link>
            </div>
          )}

          {/* PAGINACIÓN */}
          {totalRecords >
            0 && (
            <footer className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página{" "}
                <span className="font-semibold text-slate-800">
                  {
                    safePage
                  }
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-800">
                  {
                    totalPages
                  }
                </span>
              </p>

              <div className="flex items-center gap-2">
                {safePage >
                1 ? (
                  <Link
                    href={createPageUrl(
                      safePage -
                        1,
                      filters
                    )}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <ChevronLeft
                      size={
                        17
                      }
                    />

                    Anterior
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    <ChevronLeft
                      size={
                        17
                      }
                    />

                    Anterior
                  </span>
                )}

                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from(
                    {
                      length:
                        totalPages,
                    },
                    (
                      _,
                      index
                    ) =>
                      index +
                      1
                  )
                    .filter(
                      (
                        page
                      ) =>
                        page ===
                          1 ||
                        page ===
                          totalPages ||
                        Math.abs(
                          page -
                            safePage
                        ) <=
                          1
                    )
                    .map(
                      (
                        page,
                        index,
                        visiblePages
                      ) => {
                        const previousPage =
                          visiblePages[
                            index -
                              1
                          ];

                        const shouldShowSeparator =
                          previousPage &&
                          page -
                            previousPage >
                            1;

                        return (
                          <div
                            key={
                              page
                            }
                            className="flex items-center gap-1"
                          >
                            {shouldShowSeparator && (
                              <span className="px-2 text-slate-400">
                                …
                              </span>
                            )}

                            <Link
                              href={createPageUrl(
                                page,
                                filters
                              )}
                              className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                                page ===
                                safePage
                                  ? "bg-slate-900 text-white"
                                  : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                              }`}
                            >
                              {
                                page
                              }
                            </Link>
                          </div>
                        );
                      }
                    )}
                </div>

                {safePage <
                totalPages ? (
                  <Link
                    href={createPageUrl(
                      safePage +
                        1,
                      filters
                    )}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Siguiente

                    <ChevronRight
                      size={
                        17
                      }
                    />
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    Siguiente

                    <ChevronRight
                      size={
                        17
                      }
                    />
                  </span>
                )}
              </div>
            </footer>
          )}
        </section>

        <div className="mt-6 flex justify-end">
          <Link
            href="/compras"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
          >
            Registrar una nueva compra

            <ArrowRight
              size={17}
            />
          </Link>
        </div>
      </div>
    </main>
  );
}