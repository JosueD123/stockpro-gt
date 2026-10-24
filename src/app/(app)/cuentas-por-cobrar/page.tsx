import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  PlusCircle,
  RotateCcw,
  Search,
  Users,
  WalletCards,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    customerId?: string;
    status?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

type DisplayStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

function formatCurrency(value: number) {
  return `Q${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
  }).format(date);
}

function getDisplayStatus(status: string, dueDate: Date): DisplayStatus {
  if (status !== "PAID" && dueDate < new Date()) return "OVERDUE";
  if (status === "PAID") return "PAID";
  if (status === "PARTIAL") return "PARTIAL";
  return "PENDING";
}

function getStatusInfo(status: DisplayStatus) {
  switch (status) {
    case "PAID":
      return { label: "Pagada", className: "bg-green-100 text-green-700" };
    case "PARTIAL":
      return { label: "Parcial", className: "bg-blue-100 text-blue-700" };
    case "OVERDUE":
      return { label: "Vencida", className: "bg-red-100 text-red-700" };
    default:
      return { label: "Pendiente", className: "bg-amber-100 text-amber-700" };
  }
}

function createPageUrl(
  page: number,
  filters: { q: string; customerId: string; status: string }
) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.status) params.set("status", filters.status);

  params.set("page", String(page));

  return `/cuentas-por-cobrar?${params.toString()}`;
}

export default async function CuentasPorCobrarPage({
  searchParams,
}: PageProps) {
  const auth = await requireRole(["ADMIN", "SELLER", "VIEWER"]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const q = String(params.q || "").trim();
  const customerIdValue = String(params.customerId || "").trim();
  const statusFilter = String(params.status || "").trim().toUpperCase();

  const requestedPage = Number(params.page || "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const customerId = Number(customerIdValue);

  const where: Prisma.AccountReceivableWhereInput = {};

  if (q) {
    const saleId = Number(q);

    if (Number.isInteger(saleId) && saleId > 0) {
      where.OR = [
        {
          saleId,
        },
        {
          customer: {
            name: {
              contains: q,
            },
          },
        },
      ];
    } else {
      where.customer = {
        name: {
          contains: q,
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

  if (
    statusFilter === "PENDING" ||
    statusFilter === "PARTIAL" ||
    statusFilter === "PAID"
  ) {
    where.status = statusFilter;
  }

  const [customers, totalRecords, totals] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.accountReceivable.count({
      where,
    }),

    prisma.accountReceivable.aggregate({
      where,
      _sum: {
        balance: true,
        paidAmount: true,
        originalAmount: true,
      },
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / PAGE_SIZE)
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const accounts = await prisma.accountReceivable.findMany({
    where,
    include: {
      customer: true,
      sale: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const totalPending = totals._sum.balance || 0;
  const totalPaid = totals._sum.paidAmount || 0;
  const totalOriginal = totals._sum.originalAmount || 0;

  const activeAccounts = accounts.filter(
    (account) => account.status !== "PAID"
  );

  const overdueAccounts = activeAccounts.filter(
    (account) => account.dueDate < new Date()
  );

  const filters = {
    q,
    customerId: customerIdValue,
    status: statusFilter,
  };

  const startRecord =
    totalRecords === 0
      ? 0
      : (safePage - 1) * PAGE_SIZE + 1;

  const endRecord = Math.min(
    safePage * PAGE_SIZE,
    totalRecords
  );

  const role = auth.session.role;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <Link
            href="/ventas"
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <ArrowLeft size={17} />
            Volver a ventas
          </Link>

          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">
            <CreditCard size={17} />
            Finanzas
          </div>

          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Cuentas por cobrar
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Control y seguimiento de ventas realizadas al crédito,
            saldos pendientes y abonos recibidos.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Saldo pendiente
                </p>
                <p className="mt-2 text-2xl font-bold text-red-700">
                  {formatCurrency(totalPending)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <DollarSign size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Deudas activas
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {activeAccounts.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Users size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Cuentas vencidas
                </p>
                <p className="mt-2 text-3xl font-bold text-red-700">
                  {overdueAccounts.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total abonado
                </p>
                <p className="mt-2 text-2xl font-bold text-green-700">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <WalletCards size={23} />
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
                  Filtros de cuentas
                </h2>
                <p className="text-sm text-slate-500">
                  Busca por cliente, número de venta o estado.
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
                Cliente o venta
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
                  placeholder="Ejemplo: Juan o 15..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Todos los clientes</option>

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
                htmlFor="status"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Estado
              </label>

              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="PARTIAL">Parciales</option>
                <option value="PAID">Pagadas</option>
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <Search size={17} />
                Buscar
              </button>

              <Link
                href="/cuentas-por-cobrar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                title="Limpiar filtros"
              >
                <RotateCcw size={17} />
              </Link>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Historial de cuentas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Mostrando {startRecord}–{endRecord} de{" "}
                {totalRecords} cuentas.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              Total original filtrado:{" "}
              <span className="font-bold text-slate-800">
                {formatCurrency(totalOriginal)}
              </span>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <CreditCard
                className="mx-auto mb-4 text-slate-300"
                size={54}
              />

              <h3 className="text-lg font-bold text-slate-800">
                No se encontraron cuentas
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                No existen cuentas por cobrar que coincidan con
                los filtros seleccionados.
              </p>

              <Link
                href="/cuentas-por-cobrar"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <RotateCcw size={17} />
                Mostrar todas
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Cliente</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Venta</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">Vencimiento</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">Total</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">Saldo</th>
                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">Estado</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {accounts.map((account) => {
                      const info = getStatusInfo(
                        getDisplayStatus(
                          account.status,
                          account.dueDate
                        )
                      );

                      return (
                        <tr
                          key={account.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">
                              {account.customer.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Cuenta #{account.id}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/ventas/${account.saleId}`}
                              className="font-semibold text-blue-700 hover:text-blue-900"
                            >
                              Venta #{account.saleId}
                            </Link>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {formatDate(account.dueDate)}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-800">
                            {formatCurrency(account.originalAmount)}
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-red-700">
                            {formatCurrency(account.balance)}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${info.className}`}
                            >
                              {info.label}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {role !== "VIEWER" &&
                                account.balance > 0 && (
                                  <Link
                                    href={`/cuentas-por-cobrar/${account.id}/abono`}
                                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                                  >
                                    <PlusCircle size={15} />
                                    Abono
                                  </Link>
                                )}

                              <Link
                                href={`/cuentas-por-cobrar/${account.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                              >
                                <Eye size={15} />
                                Ver
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
                {accounts.map((account) => {
                  const info = getStatusInfo(
                    getDisplayStatus(
                      account.status,
                      account.dueDate
                    )
                  );

                  return (
                    <article
                      key={account.id}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">
                            {account.customer.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Venta #{account.saleId}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${info.className}`}
                        >
                          {info.label}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
                          <p className="mt-1 font-semibold">{formatCurrency(account.originalAmount)}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Saldo</p>
                          <p className="mt-1 font-bold text-red-700">{formatCurrency(account.balance)}</p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">Vencimiento</p>
                          <p className="mt-1 text-sm font-semibold">{formatDate(account.dueDate)}</p>
                        </div>
                      </div>

                      <div
                        className={`mt-4 grid gap-3 ${
                          role !== "VIEWER" && account.balance > 0
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        {role !== "VIEWER" &&
                          account.balance > 0 && (
                            <Link
                              href={`/cuentas-por-cobrar/${account.id}/abono`}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                            >
                              <PlusCircle size={16} />
                              Registrar abono
                            </Link>
                          )}

                        <Link
                          href={`/cuentas-por-cobrar/${account.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                        >
                          <Eye size={16} />
                          Ver detalle
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
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
                    href={createPageUrl(safePage - 1, filters)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700"
                  >
                    Anterior
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    Anterior
                  </span>
                )}

                <span className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                  {safePage}/{totalPages}
                </span>

                {safePage < totalPages ? (
                  <Link
                    href={createPageUrl(safePage + 1, filters)}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Siguiente
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400">
                    Siguiente
                  </span>
                )}
              </div>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}

