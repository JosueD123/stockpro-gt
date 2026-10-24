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
  ShoppingCart,
  UserRound,
} from "lucide-react";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    customerId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function createPageUrl(
  page: number,
  filters: {
    q: string;
    customerId: string;
    from: string;
    to: string;
  }
) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.customerId) {
    params.set("customerId", filters.customerId);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  params.set("page", String(page));

  return `/ventas/historial?${params.toString()}`;
}

export default async function HistorialVentasPage({
  searchParams,
}: PageProps) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Historial de ventas:
   * - ADMIN
   * - SELLER
   */

  const auth = await requireRole([
    "ADMIN",
    "SELLER",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const q = String(params.q || "").trim();
  const customerIdValue = String(
    params.customerId || ""
  ).trim();
  const from = String(params.from || "").trim();
  const to = String(params.to || "").trim();

  const requestedPage = Number(params.page || "1");

  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const customerId = Number(customerIdValue);

  const where: Prisma.SaleWhereInput = {};

  if (q) {
    const saleId = Number(q);

    if (Number.isInteger(saleId) && saleId > 0) {
      where.OR = [
        {
          id: saleId,
        },
        {
          customer: {
            is: {
              name: {
                contains: q,
              },
            },
          },
        },
      ];
    } else {
      where.customer = {
        is: {
          name: {
            contains: q,
          },
        },
      };
    }
  }

  if (
    customerIdValue &&
    Number.isInteger(customerId) &&
    customerId > 0
  ) {
    where.customerId = customerId;
  }

  const dateFilter: Prisma.DateTimeFilter = {};

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);

    if (!Number.isNaN(fromDate.getTime())) {
      dateFilter.gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999`);

    if (!Number.isNaN(toDate.getTime())) {
      dateFilter.lte = toDate;
    }
  }

  if (dateFilter.gte || dateFilter.lte) {
    where.createdAt = dateFilter;
  }

  const [
    customers,
    totalRecords,
    totals,
    businessConfig,
  ] = await Promise.all([
    prisma.customer.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.sale.count({
      where,
    }),

    prisma.sale.aggregate({
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

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: true,
      accountReceivable: true,
      items: {
        select: {
          id: true,
          quantity: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const currency =
    businessConfig?.currency || "GTQ";

  const totalAmount =
    totals._sum.total || 0;

  const creditPending = sales.reduce(
    (sum, sale) =>
      sum + (sale.accountReceivable?.balance || 0),
    0
  );

  const creditSalesOnPage = sales.filter(
    (sale) => sale.paymentType === "CREDIT"
  ).length;

  const unitsOnCurrentPage = sales.reduce(
    (saleAccumulator, sale) =>
      saleAccumulator +
      sale.items.reduce(
        (itemAccumulator, item) =>
          itemAccumulator + item.quantity,
        0
      ),
    0
  );

  const filters = {
    q,
    customerId: customerIdValue,
    from,
    to,
  };

  const startRecord =
    totalRecords === 0
      ? 0
      : (safePage - 1) * PAGE_SIZE + 1;

  const endRecord = Math.min(
    safePage * PAGE_SIZE,
    totalRecords
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Link
            href="/ventas"
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            Volver a ventas
          </Link>

          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
            <ShoppingCart size={17} />
            <span>Operaciones comerciales</span>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Historial de ventas
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Consulta todas las ventas registradas, aplica filtros
            y accede al comprobante de cada operación.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Ventas encontradas
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {totalRecords}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ReceiptText size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">
                  Total vendido
                </p>

                <p className="mt-2 truncate text-2xl font-bold text-slate-900">
                  {formatMoney(totalAmount, currency)}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <CircleDollarSign size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">
                  Crédito en esta página
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-700">
                  {creditSalesOnPage}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <CircleDollarSign size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">
                  Pendiente por cobrar
                </p>

                <p className="mt-2 truncate text-2xl font-bold text-red-700">
                  {formatMoney(creditPending, currency)}
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <CircleDollarSign size={23} />
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
                  {unitsOnCurrentPage}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Package size={23} />
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
                  {safePage}
                  <span className="text-lg text-slate-400">
                    /{totalPages}
                  </span>
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CalendarDays size={23} />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Filter size={19} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Filtros de búsqueda
                </h2>

                <p className="text-sm text-slate-500">
                  Busca por número de venta, cliente o rango de
                  fechas.
                </p>
              </div>
            </div>
          </div>

          <form
            method="GET"
            className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-4"
          >
            <div>
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Número o cliente
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
                  defaultValue={q}
                  placeholder="Ejemplo: 15 o nombre..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="customerId"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Cliente
              </label>

              <select
                id="customerId"
                name="customerId"
                defaultValue={customerIdValue}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">
                  Todos los clientes
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

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
                defaultValue={from}
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
                defaultValue={to}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row xl:col-span-4">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Search size={17} />
                Buscar ventas
              </button>

              <Link
                href="/ventas/historial"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                <RotateCcw size={17} />
                Limpiar filtros
              </Link>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Ventas registradas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Mostrando {startRecord}–{endRecord} de{" "}
                {totalRecords} resultados.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <CalendarDays size={17} />
              Ordenadas de la más reciente a la más antigua
            </div>
          </div>

          {sales.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Venta
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Cliente
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Fecha
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Pago
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Estado
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Productos
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Unidades
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                        Total
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {sales.map((sale) => {
                      const totalUnits = sale.items.reduce(
                        (accumulator, item) =>
                          accumulator + item.quantity,
                        0
                      );

                      return (
                        <tr
                          key={sale.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">
                              #{sale.id}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <UserRound
                                size={16}
                                className="shrink-0 text-slate-400"
                              />

                              <p className="text-sm font-medium text-slate-700">
                                {sale.customer?.name ||
                                  "Consumidor final"}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatDate(sale.createdAt)}
                          </td>

                          <td className="px-5 py-4 text-center">
                            {sale.paymentType === "CREDIT" ? (
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                Crédito
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                Contado
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            {sale.accountReceivable ? (
                              (() => {
                                const status =
                                  sale.accountReceivable.status === "PAID"
                                    ? "Pagada"
                                    : sale.accountReceivable.status === "PARTIAL"
                                      ? "Parcial"
                                      : sale.accountReceivable.dueDate < new Date()
                                        ? "Vencida"
                                        : "Pendiente";

                                const className =
                                  status === "Pagada"
                                    ? "bg-green-100 text-green-700"
                                    : status === "Parcial"
                                      ? "bg-blue-100 text-blue-700"
                                      : status === "Vencida"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700";

                                return (
                                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>
                                    {status}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                              {sale.items.length}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-semibold text-slate-700">
                              {totalUnits}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-slate-900">
                            {formatMoney(
                              sale.total,
                              currency
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/ventas/${sale.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                <Eye size={15} />
                                Ver detalle
                              </Link>

                              <Link
                                href={`/ventas/${sale.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                              >
                                <Printer size={15} />
                                Imprimir
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-200 lg:hidden">
                {sales.map((sale) => {
                  const totalUnits = sale.items.reduce(
                    (accumulator, item) =>
                      accumulator + item.quantity,
                    0
                  );

                  return (
                    <article
                      key={sale.id}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">
                            Venta #{sale.id}
                          </p>

                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                            <UserRound size={15} />
                            {sale.customer?.name ||
                              "Consumidor final"}
                          </p>
                        </div>

                        <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          Completada
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Pago
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {sale.paymentType === "CREDIT"
                              ? "Crédito"
                              : "Contado"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Estado
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {sale.accountReceivable
                              ? sale.accountReceivable.status === "PAID"
                                ? "Pagada"
                                : sale.accountReceivable.status === "PARTIAL"
                                  ? "Parcial"
                                  : sale.accountReceivable.dueDate < new Date()
                                    ? "Vencida"
                                    : "Pendiente"
                              : "Completada"}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Fecha
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatDate(sale.createdAt)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Productos
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {sale.items.length}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Unidades
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {totalUnits}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Total
                          </p>

                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatMoney(
                              sale.total,
                              currency
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Link
                          href={`/ventas/${sale.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Eye size={16} />
                          Ver detalle
                        </Link>

                        <Link
                          href={`/ventas/${sale.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                        >
                          <Printer size={16} />
                          Imprimir
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-6 py-20 text-center">
              <ReceiptText
                className="mx-auto mb-4 text-slate-300"
                size={54}
              />

              <h3 className="text-lg font-bold text-slate-800">
                No se encontraron ventas
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No existen ventas que coincidan con los filtros
                seleccionados. Cambia los criterios de búsqueda e
                inténtalo nuevamente.
              </p>

              <Link
                href="/ventas/historial"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <RotateCcw size={17} />
                Mostrar todas
              </Link>
            </div>
          )}

          {totalRecords > 0 && (
            <footer className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página{" "}
                <span className="font-semibold text-slate-800">
                  {safePage}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-800">
                  {totalPages}
                </span>
              </p>

              <div className="flex items-center gap-2">
                {safePage > 1 ? (
                  <Link
                    href={createPageUrl(
                      safePage - 1,
                      filters
                    )}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <ChevronLeft size={17} />
                    Anterior
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    <ChevronLeft size={17} />
                    Anterior
                  </span>
                )}

                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) => index + 1
                  )
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - safePage) <= 1
                    )
                    .map(
                      (
                        page,
                        index,
                        visiblePages
                      ) => {
                        const previousPage =
                          visiblePages[index - 1];

                        const showSeparator =
                          previousPage &&
                          page - previousPage > 1;

                        return (
                          <div
                            key={page}
                            className="flex items-center gap-1"
                          >
                            {showSeparator && (
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
                                page === safePage
                                  ? "bg-slate-900 text-white"
                                  : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                              }`}
                            >
                              {page}
                            </Link>
                          </div>
                        );
                      }
                    )}
                </div>

                {safePage < totalPages ? (
                  <Link
                    href={createPageUrl(
                      safePage + 1,
                      filters
                    )}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Siguiente
                    <ChevronRight size={17} />
                  </Link>
                ) : (
                  <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    Siguiente
                    <ChevronRight size={17} />
                  </span>
                )}
              </div>
            </footer>
          )}
        </section>

        <div className="mt-6 flex justify-end">
          <Link
            href="/ventas"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
          >
            Registrar una nueva venta
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </main>
  );
}