import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Hash,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import PrintButton from "@/components/PrintButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoney(
  value: number,
  currency: string
) {
  return `${currency} ${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function VentaDetallePage({
  params,
}: Props) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * ADMIN y SELLER pueden consultar
   * e imprimir comprobantes de venta.
   */

  const auth = await requireRole([
    "ADMIN",
    "SELLER",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const saleId = Number(id);

  if (
    !Number.isInteger(saleId) ||
    saleId <= 0
  ) {
    notFound();
  }

  const [sale, business] = await Promise.all([
    prisma.sale.findUnique({
      where: {
        id: saleId,
      },
      include: {
        customer: true,
        accountReceivable: true,
        items: {
          include: {
            product: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    }),

    prisma.businessConfig.findFirst(),
  ]);

  if (!sale) {
    notFound();
  }

  const currency =
    business?.currency || "GTQ";

  const totalUnits = sale.items.reduce(
    (accumulator, item) =>
      accumulator + item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            href="/ventas"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft size={17} />
            Volver a ventas
          </Link>

          <div className="w-full sm:w-auto">
            <PrintButton />
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl print:rounded-none print:border-none print:shadow-none">
          <header className="border-b border-slate-200 bg-slate-900 px-6 py-7 text-white sm:px-9 print:bg-white print:px-0 print:py-4 print:text-slate-900">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-300 print:text-slate-600">
                  <ReceiptText size={18} />
                  Comprobante de venta
                </div>

                <h1 className="text-3xl font-bold tracking-tight">
                  {business?.name ||
                    "ControlStock Pro"}
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 print:text-slate-600">
                  Documento generado por el sistema de
                  gestión comercial e inventario.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left backdrop-blur-sm sm:text-right print:border-slate-300 print:bg-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300 print:text-slate-500">
                  Número de venta
                </p>

                <p className="mt-1 text-2xl font-bold">
                  #{sale.id}
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-400/15 px-3 py-1 text-xs font-semibold text-green-300 print:border print:border-green-200 print:bg-green-50 print:text-green-700">
                  <BadgeCheck size={14} />
                  Completada
                </div>
              </div>
            </div>
          </header>

          <div className="px-6 py-7 sm:px-9 print:px-0">
            <section className="grid grid-cols-1 gap-4 border-b border-slate-200 pb-7 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 print:bg-white">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 print:border print:border-slate-300 print:bg-white print:text-slate-700">
                    <UserRound size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Cliente
                    </p>

                    <h2 className="font-bold text-slate-900">
                      {sale.customer?.name ||
                        "Consumidor final"}
                    </h2>
                  </div>
                </div>

                {sale.customer ? (
                  <div className="space-y-2 text-sm text-slate-600">
                    {"phone" in sale.customer &&
                      sale.customer.phone && (
                        <p className="flex items-center gap-2">
                          <Phone
                            size={15}
                            className="text-slate-400"
                          />

                          {String(
                            sale.customer.phone
                          )}
                        </p>
                      )}

                    {"email" in sale.customer &&
                      sale.customer.email && (
                        <p className="flex items-center gap-2">
                          <Mail
                            size={15}
                            className="text-slate-400"
                          />

                          {String(
                            sale.customer.email
                          )}
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Venta realizada sin cliente
                    registrado.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 print:bg-white">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 print:border print:border-slate-300 print:bg-white print:text-slate-700">
                    <ShoppingCart size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Información de la venta
                    </p>

                    <h2 className="font-bold text-slate-900">
                      Detalle de operación
                    </h2>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <CalendarDays
                      size={15}
                      className="text-slate-400"
                    />

                    {formatDate(sale.createdAt)}
                  </p>

                  <p className="flex items-center gap-2">
                    <Hash
                      size={15}
                      className="text-slate-400"
                    />

                    Venta #{sale.id}
                  </p>

                  <p className="flex items-center gap-2">
                    <Package
                      size={15}
                      className="text-slate-400"
                    />

                    {totalUnits} unidad
                    {totalUnits !== 1 ? "es" : ""} en{" "}
                    {sale.items.length} producto
                    {sale.items.length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>
            </section>

            <section className="py-7">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Productos vendidos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Detalle de productos, cantidades y
                  precios registrados en la venta.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[680px] border-collapse">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                          Producto
                        </th>

                        <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                          Cantidad
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                          Precio unitario
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                          Subtotal
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {sale.items.map((item) => {
                        const subtotal =
                          item.quantity *
                          item.price;

                        return (
                          <tr
                            key={item.id}
                            className="bg-white"
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {item.product.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Código:{" "}
                                {item.product.code ||
                                  "Sin código"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                                {item.quantity}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-medium text-slate-700">
                              {formatMoney(
                                item.price,
                                currency
                              )}
                            </td>

                            <td className="px-5 py-4 text-right font-bold text-slate-900">
                              {formatMoney(
                                subtotal,
                                currency
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-200 sm:hidden">
                  {sale.items.map((item) => {
                    const subtotal =
                      item.quantity * item.price;

                    return (
                      <article
                        key={item.id}
                        className="p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Código:{" "}
                              {item.product.code ||
                                "Sin código"}
                            </p>
                          </div>

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            × {item.quantity}
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-slate-500">
                              Precio unitario
                            </p>

                            <p className="text-sm font-semibold text-slate-700">
                              {formatMoney(
                                item.price,
                                currency
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-slate-500">
                              Subtotal
                            </p>

                            <p className="font-bold text-slate-900">
                              {formatMoney(
                                subtotal,
                                currency
                              )}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="flex justify-end border-t border-slate-200 pt-7">
              <div className="w-full max-w-sm">
                <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-6 py-5 text-white print:border print:border-slate-300 print:bg-white print:text-slate-900">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-300 print:text-slate-500">
                      Total de la venta
                    </p>

                    <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                      {totalUnits} unidad
                      {totalUnits !== 1 ? "es" : ""}
                    </p>
                  </div>

                  <p className="text-2xl font-bold">
                    {formatMoney(
                      sale.total,
                      currency
                    )}
                  </p>
                </div>
              </div>
            </section>

            <footer className="mt-8 border-t border-dashed border-slate-300 pt-6 text-center">
              <p className="font-semibold text-slate-800">
                ¡Gracias por su compra!
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
                {business?.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} />
                    {business.address}
                  </span>
                )}

                {business?.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={13} />
                    {business.phone}
                  </span>
                )}

                {business?.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={13} />
                    {business.email}
                  </span>
                )}
              </div>

              {business?.nit && (
                <p className="mt-2 text-xs text-slate-500">
                  NIT: {business.nit}
                </p>
              )}
            </footer>
          </div>
        </section>

        <div className="mt-6 flex justify-center print:hidden">
          <Link
            href="/ventas"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
          >
            <ArrowLeft size={16} />
            Regresar al módulo de ventas
          </Link>
        </div>
      </div>
    </main>
  );
}