import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Eye,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  User,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(value: number) {
  return `Q${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getReceivableStatus(
  status: string,
  dueDate: Date
) {
  if (
    status !== "PAID" &&
    dueDate < new Date()
  ) {
    return {
      label: "Vencida",
      className:
        "bg-red-100 text-red-700",
    };
  }

  if (status === "PAID") {
    return {
      label: "Pagada",
      className:
        "bg-green-100 text-green-700",
    };
  }

  if (status === "PARTIAL") {
    return {
      label: "Parcial",
      className:
        "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: "Pendiente",
    className:
      "bg-amber-100 text-amber-700",
  };
}

export default async function ClienteDetallePage({
  params,
}: Props) {
  const auth = await requireRole([
    "ADMIN",
    "SELLER",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const customerId = Number(id);

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    notFound();
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        id: customerId,
      },

      include: {
        sales: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },

        accountsReceivable: {
          include: {
            payments: {
              orderBy: {
                paymentDate: "desc",
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (!customer) {
    notFound();
  }

  const totalSales =
    customer.sales.reduce(
      (total, sale) =>
        total + sale.total,
      0
    );

  const totalReceivableOriginal =
    customer.accountsReceivable.reduce(
      (total, account) =>
        total + account.originalAmount,
      0
    );

  const totalPaid =
    customer.accountsReceivable.reduce(
      (total, account) =>
        total + account.paidAmount,
      0
    );

  const totalBalance =
    customer.accountsReceivable.reduce(
      (total, account) =>
        total + account.balance,
      0
    );

  const pendingAccounts =
    customer.accountsReceivable.filter(
      (account) =>
        account.status !== "PAID"
    );

  const overdueAccounts =
    pendingAccounts.filter(
      (account) =>
        account.dueDate < new Date()
    );

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">
              <User size={17} />
              Clientes
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              {customer.name}
            </h1>

            <p className="mt-1 text-slate-500">
              Información comercial y financiera del cliente.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/clientes"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              <ArrowLeft size={18} />
              Volver
            </Link>

            <Link
              href={`/clientes/${customer.id}/editar`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Editar cliente
            </Link>
          </div>
        </header>

        {/* DATOS DEL CLIENTE */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <User size={21} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Información del cliente
              </h2>

              <p className="text-sm text-slate-500">
                Datos registrados en el sistema.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex gap-3">
              <Phone className="text-slate-500" />

              <div>
                <p className="text-sm text-slate-500">
                  Teléfono
                </p>

                <p className="font-semibold text-slate-900">
                  {customer.phone ||
                    "No registrado"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Mail className="text-slate-500" />

              <div>
                <p className="text-sm text-slate-500">
                  Correo electrónico
                </p>

                <p className="font-semibold text-slate-900">
                  {customer.email ||
                    "No registrado"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <MapPin className="text-slate-500" />

              <div>
                <p className="text-sm text-slate-500">
                  Dirección
                </p>

                <p className="font-semibold text-slate-900">
                  {customer.address ||
                    "No registrada"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CalendarDays className="text-slate-500" />

              <div>
                <p className="text-sm text-slate-500">
                  Cliente desde
                </p>

                <p className="font-semibold text-slate-900">
                  {formatDate(
                    customer.createdAt
                  )}
                </p>
              </div>
            </div>
          </div>

          {customer.notes && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Notas
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {customer.notes}
              </p>
            </div>
          )}
        </section>

        {/* MÉTRICAS */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Ventas
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {customer.sales.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total vendido
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatCurrency(totalSales)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Créditos otorgados
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                totalReceivableOriginal
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total abonado
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatCurrency(totalPaid)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm text-red-700">
              Saldo pendiente
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {formatCurrency(totalBalance)}
            </p>

            <p className="mt-1 text-xs text-red-600">
              {overdueAccounts.length > 0
                ? `${overdueAccounts.length} cuenta${
                    overdueAccounts.length === 1
                      ? ""
                      : "s"
                  } vencida${
                    overdueAccounts.length === 1
                      ? ""
                      : "s"
                  }`
                : pendingAccounts.length > 0
                  ? `${pendingAccounts.length} cuenta${
                      pendingAccounts.length === 1
                        ? ""
                        : "s"
                    } pendiente${
                      pendingAccounts.length === 1
                        ? ""
                        : "s"
                    }`
                  : "Sin deuda pendiente"}
            </p>
          </div>
        </section>

        {/* CUENTAS POR COBRAR */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <CreditCard className="text-violet-700" />

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Cuentas por cobrar
                </h2>

                <p className="text-sm text-slate-500">
                  Créditos y abonos registrados para este cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4 text-left">
                    Venta
                  </th>

                  <th className="p-4 text-left">
                    Vencimiento
                  </th>

                  <th className="p-4 text-right">
                    Total
                  </th>

                  <th className="p-4 text-right">
                    Abonado
                  </th>

                  <th className="p-4 text-right">
                    Saldo
                  </th>

                  <th className="p-4 text-center">
                    Estado
                  </th>

                  <th className="p-4 text-center">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {customer.accountsReceivable.map(
                  (account) => {
                    const status =
                      getReceivableStatus(
                        account.status,
                        account.dueDate
                      );

                    return (
                      <tr
                        key={account.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="p-4 font-semibold text-slate-900">
                          #{account.saleId}
                        </td>

                        <td className="p-4 text-slate-600">
                          {formatDate(
                            account.dueDate
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {formatCurrency(
                            account.originalAmount
                          )}
                        </td>

                        <td className="p-4 text-right text-green-700">
                          {formatCurrency(
                            account.paidAmount
                          )}
                        </td>

                        <td className="p-4 text-right font-bold text-red-700">
                          {formatCurrency(
                            account.balance
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <Link
                            href={`/cuentas-por-cobrar/${account.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            <Eye size={14} />
                            Ver
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}

                {customer.accountsReceivable.length ===
                  0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-10 text-center text-slate-500"
                      >
                        Este cliente no tiene cuentas por cobrar registradas.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </section>

        {/* HISTORIAL DE VENTAS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <ReceiptText className="text-green-700" />

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Historial de ventas
                </h2>

                <p className="text-sm text-slate-500">
                  Ventas registradas para este cliente.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-4 text-left">
                    Venta
                  </th>

                  <th className="p-4 text-left">
                    Fecha
                  </th>

                  <th className="p-4 text-center">
                    Productos
                  </th>

                  <th className="p-4 text-right">
                    Total
                  </th>

                  <th className="p-4 text-center">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {customer.sales.map(
                  (sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100"
                    >
                      <td className="p-4 font-semibold text-slate-900">
                        #{sale.id}
                      </td>

                      <td className="p-4 text-slate-600">
                        {formatDate(
                          sale.createdAt
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {sale.items.length}
                      </td>

                      <td className="p-4 text-right font-bold text-green-700">
                        {formatCurrency(
                          sale.total
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <Link
                          href={`/ventas/${sale.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                        >
                          <ReceiptText
                            size={14}
                          />
                          Ver venta
                        </Link>
                      </td>
                    </tr>
                  )
                )}

                {customer.sales.length ===
                  0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-10 text-center text-slate-500"
                      >
                        Este cliente no tiene ventas registradas.
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
