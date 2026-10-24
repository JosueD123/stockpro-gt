import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Hash,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  Truck,
} from "lucide-react";

import PurchasePrintButton from "./PurchasePrintButton";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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
      month: "long",
      year: "numeric",
    }
  ).format(value);
}

function formatDateTime(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "es-GT",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

export default async function PurchaseDetailPage({
  params,
}: PageProps) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Solo ADMIN puede ver
   * comprobantes de compra.
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
   * ID
   * ==========================================
   */

  const resolvedParams =
    await params;

  const purchaseId =
    Number(
      resolvedParams.id
    );

  if (
    !Number.isInteger(
      purchaseId
    ) ||
    purchaseId <= 0
  ) {
    notFound();
  }

  /*
   * ==========================================
   * CONSULTAS
   * ==========================================
   */

  const [
    purchase,
    businessConfig,
  ] = await Promise.all([
    prisma.purchase.findUnique({
      where: {
        id:
          purchaseId,
      },

      include: {
        supplier: true,

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

  if (!purchase) {
    notFound();
  }

  /*
   * ==========================================
   * NEGOCIO Y MONEDA
   * ==========================================
   */

  const businessName =
    businessConfig?.name ||
    "ControlStock Pro";

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
   * TOTALES
   * ==========================================
   */

  const totalUnits =
    purchase.items.reduce(
      (
        accumulator,
        item
      ) =>
        accumulator +
        item.quantity,
      0
    );

  const calculatedTotal =
    purchase.items.reduce(
      (
        accumulator,
        item
      ) =>
        accumulator +
        item.subtotal,
      0
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl">
        {/* ACCIONES */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            href="/compras"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft
              size={18}
            />

            Volver a compras
          </Link>

          <PurchasePrintButton />
        </div>

        <article className="overflow-hidden rounded-2xl bg-white shadow-md print:rounded-none print:shadow-none">
          {/* ENCABEZADO */}
          <header className="border-b border-slate-200 bg-slate-900 px-8 py-7 text-white print:border-b-2 print:border-slate-900 print:bg-white print:px-0 print:text-slate-900">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300 print:text-slate-600">
                  <ReceiptText
                    size={18}
                  />

                  Comprobante de compra
                </div>

                <h1 className="text-3xl font-bold">
                  {
                    businessName
                  }
                </h1>

                <p className="mt-2 text-sm text-slate-300 print:text-slate-600">
                  Registro de abastecimiento e inventario
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-300 print:text-slate-600">
                  Número de compra
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {
                    purchase.purchaseNumber
                  }
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                    purchase.status
                  )}`}
                >
                  {getStatusLabel(
                    purchase.status
                  )}
                </span>
              </div>
            </div>
          </header>

          <div className="p-8 print:px-0 print:py-6">
            {/* RESUMEN */}
            <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <CalendarDays
                    size={17}
                  />

                  Fecha de compra
                </div>

                <p className="font-bold text-slate-900">
                  {formatDate(
                    purchase.purchaseDate
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Registrada:{" "}
                  {formatDateTime(
                    purchase.createdAt
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Package
                    size={17}
                  />

                  Productos
                </div>

                <p className="font-bold text-slate-900">
                  {
                    purchase.items.length
                  }{" "}
                  producto
                  {purchase.items.length !==
                  1
                    ? "s"
                    : ""}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    totalUnits
                  }{" "}
                  unidad
                  {totalUnits !==
                  1
                    ? "es"
                    : ""}{" "}
                  comprada
                  {totalUnits !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white print:bg-white print:text-slate-900">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300 print:text-slate-500">
                  <CircleDollarSign
                    size={17}
                  />

                  Total de la compra
                </div>

                <p className="text-2xl font-bold">
                  {formatMoney(
                    purchase.total,
                    currencySymbol
                  )}
                </p>

                {Math.abs(
                  calculatedTotal -
                    purchase.total
                ) >
                  0.01 && (
                  <p className="mt-1 text-xs text-amber-300 print:text-amber-700">
                    El total calculado no coincide con el total guardado.
                  </p>
                )}
              </div>
            </section>

            {/* PROVEEDOR */}
            <section className="mt-7">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Truck
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Información del proveedor
                  </h2>

                  <p className="text-sm text-slate-500">
                    Datos asociados a esta compra.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Building2
                        size={
                          15
                        }
                      />

                      Proveedor
                    </p>

                    <p className="font-semibold text-slate-900">
                      {
                        purchase.supplier.name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Phone
                        size={
                          15
                        }
                      />

                      Teléfono
                    </p>

                    <p className="text-sm text-slate-700">
                      {purchase.supplier.phone ||
                        "No registrado"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Mail
                        size={
                          15
                        }
                      />

                      Correo
                    </p>

                    <p className="break-words text-sm text-slate-700">
                      {purchase.supplier.email ||
                        "No registrado"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <MapPin
                        size={
                          15
                        }
                      />

                      Dirección
                    </p>

                    <p className="text-sm text-slate-700">
                      {purchase.supplier.address ||
                        "No registrada"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* PRODUCTOS */}
            <section className="mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Package
                    size={20}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Productos comprados
                  </h2>

                  <p className="text-sm text-slate-500">
                    Detalle de cantidades y costos.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        #
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Código
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Producto
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Cantidad
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                        Costo unitario
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-600">
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {purchase.items.map(
                      (
                        item,
                        index
                      ) => (
                        <tr
                          key={
                            item.id
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {
                              index +
                              1
                            }
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700">
                              <Hash
                                size={
                                  13
                                }
                              />

                              {
                                item.product.code
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {
                                item.product.name
                              }
                            </p>

                            {item.product.brand && (
                              <p className="mt-1 text-xs text-slate-500">
                                Marca:{" "}
                                {
                                  item.product.brand
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center font-semibold text-slate-700">
                            {
                              item.quantity
                            }
                          </td>

                          <td className="px-5 py-4 text-right text-sm text-slate-700">
                            {formatMoney(
                              item.unitCost,
                              currencySymbol
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-slate-900">
                            {formatMoney(
                              item.subtotal,
                              currencySymbol
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                  <tfoot className="border-t-2 border-slate-900 bg-slate-50">
                    <tr>
                      <td
                        colSpan={
                          5
                        }
                        className="px-5 py-5 text-right text-sm font-bold uppercase tracking-wide text-slate-600"
                      >
                        Total general
                      </td>

                      <td className="px-5 py-5 text-right text-xl font-bold text-slate-900">
                        {formatMoney(
                          purchase.total,
                          currencySymbol
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* OBSERVACIONES */}
            <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText
                    size={18}
                    className="text-slate-500"
                  />

                  <h2 className="font-bold text-slate-900">
                    Observaciones
                  </h2>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {purchase.notes ||
                    "No se registraron observaciones para esta compra."}
                </p>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-start gap-3">
                  <BadgeCheck
                    className="mt-0.5 shrink-0 text-green-700"
                    size={21}
                  />

                  <div>
                    <h2 className="font-bold text-green-900">
                      Compra aplicada al inventario
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-green-800">
                      Esta operación aumentó las existencias de los productos y generó sus movimientos correspondientes en el Kardex.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
              Documento generado por{" "}
              {
                businessName
              }
            </footer>
          </div>
        </article>
      </div>
    </main>
  );
}