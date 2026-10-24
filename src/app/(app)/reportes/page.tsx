import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import ReportExportButtons from "@/components/ReportExportButtons";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  Filter,
  Package,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

type ReportesPageProps = {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    periodo?: string;
  }>;
};

function formatMoney(
  value: number,
  currencySymbol: string
) {
  return `${currencySymbol}${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value?: string) {
  if (!value) {
    return null;
  }

  const parts = value.split("-").map(Number);

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;

  if (
    !year ||
    !month ||
    !day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatPeriodDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ReportesPage({
  searchParams,
}: ReportesPageProps) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Reportes pueden ser consultados por:
   * - ADMIN
   * - VIEWER
   *
   * SELLER no tiene acceso.
   */

  const auth = await requireRole([
    "ADMIN",
    "VIEWER",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const today = new Date();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  /*
   * ==========================================
   * FILTROS DE FECHA
   * ==========================================
   */

  let periodStart: Date | null = null;
  let periodEndExclusive: Date | null = null;

  const selectedPeriod = params.periodo || "todo";

  if (selectedPeriod === "hoy") {
    periodStart = new Date(startOfToday);
    periodEndExclusive = new Date(startOfTomorrow);
  }

  if (selectedPeriod === "7dias") {
    periodStart = new Date(startOfToday);
    periodStart.setDate(periodStart.getDate() - 6);

    periodEndExclusive = new Date(startOfTomorrow);
  }

  if (selectedPeriod === "30dias") {
    periodStart = new Date(startOfToday);
    periodStart.setDate(periodStart.getDate() - 29);

    periodEndExclusive = new Date(startOfTomorrow);
  }

  if (selectedPeriod === "mes") {
    periodStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    periodEndExclusive = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1
    );
  }

  if (selectedPeriod === "anio") {
    periodStart = new Date(
      today.getFullYear(),
      0,
      1
    );

    periodEndExclusive = new Date(
      today.getFullYear() + 1,
      0,
      1
    );
  }

  /*
   * RANGO PERSONALIZADO
   */

  if (selectedPeriod === "personalizado") {
    const parsedFrom = parseLocalDate(params.desde);
    const parsedTo = parseLocalDate(params.hasta);

    if (parsedFrom) {
      periodStart = parsedFrom;
    }

    if (parsedTo) {
      periodEndExclusive = new Date(parsedTo);
      periodEndExclusive.setDate(
        periodEndExclusive.getDate() + 1
      );
    }
  }

  /*
   * Si se reciben fechas directamente sin periodo,
   * también tratamos el filtro como personalizado.
   */

  if (
    selectedPeriod === "todo" &&
    (params.desde || params.hasta)
  ) {
    const parsedFrom = parseLocalDate(params.desde);
    const parsedTo = parseLocalDate(params.hasta);

    if (parsedFrom) {
      periodStart = parsedFrom;
    }

    if (parsedTo) {
      periodEndExclusive = new Date(parsedTo);
      periodEndExclusive.setDate(
        periodEndExclusive.getDate() + 1
      );
    }
  }

  /*
   * Evitamos un rango invertido.
   */

  if (
    periodStart &&
    periodEndExclusive &&
    periodStart >= periodEndExclusive
  ) {
    periodStart = null;
    periodEndExclusive = null;
  }

  /*
   * FILTROS PRISMA
   */

  const saleDateFilter =
    periodStart || periodEndExclusive
      ? {
          createdAt: {
            ...(periodStart
              ? {
                  gte: periodStart,
                }
              : {}),
            ...(periodEndExclusive
              ? {
                  lt: periodEndExclusive,
                }
              : {}),
          },
        }
      : undefined;

  const purchaseDateFilter =
    periodStart || periodEndExclusive
      ? {
          purchaseDate: {
            ...(periodStart
              ? {
                  gte: periodStart,
                }
              : {}),
            ...(periodEndExclusive
              ? {
                  lt: periodEndExclusive,
                }
              : {}),
          },
        }
      : undefined;

  /*
   * ==========================================
   * CONSULTAS
   * ==========================================
   */

  const [
    business,
    products,
    sales,
    purchases,
    accountsReceivable,
  ] = await Promise.all([
    /*
     * CONFIGURACIÓN
     */

    prisma.businessConfig.findFirst(),

    /*
     * PRODUCTOS
     *
     * El inventario representa su estado ACTUAL,
     * así que no se modifica por el rango de fecha.
     */

    prisma.product.findMany({
      include: {
        category: true,
        supplier: true,
      },
      orderBy: {
        stock: "asc",
      },
    }),

    /*
     * VENTAS FILTRADAS
     */

    prisma.sale.findMany({
      where: saleDateFilter,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    /*
     * COMPRAS FILTRADAS
     */

    prisma.purchase.findMany({
      where: purchaseDateFilter,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        purchaseDate: "desc",
      },
    }),

    prisma.accountReceivable.findMany({
      include: {
        customer: true,
        sale: true,
      },

      orderBy: {
        dueDate: "asc",
      },
    }),
  ]);

  /*
   * ==========================================
   * CONFIGURACIÓN DEL NEGOCIO
   * ==========================================
   */

  const businessName =
    business?.name || "ControlStock Pro";

  const currency =
    business?.currency || "GTQ";

  const currencySymbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : "Q";

  /*
   * ==========================================
   * INVENTARIO
   * ==========================================
   */

  const lowStockProducts = products.filter(
    (product) =>
      product.stock <= product.minStock
  );

  const outOfStockProducts = products.filter(
    (product) =>
      product.stock === 0
  );

  const totalInventoryCost = products.reduce(
    (accumulator, product) =>
      accumulator +
      product.priceCost * product.stock,
    0
  );

  const totalInventorySaleValue = products.reduce(
    (accumulator, product) =>
      accumulator +
      product.priceSale * product.stock,
    0
  );

  const potentialProfit =
    totalInventorySaleValue -
    totalInventoryCost;

  /*
   * ==========================================
   * VENTAS DEL PERÍODO
   * ==========================================
   */

  const totalSales = sales.reduce(
    (accumulator, sale) =>
      accumulator + sale.total,
    0
  );

  /*
   * ==========================================
   * COMPRAS DEL PERÍODO
   * ==========================================
   */

  const completedPurchases = purchases.filter(
    (purchase) =>
      purchase.status === "COMPLETED"
  );

  const totalPurchases =
    completedPurchases.reduce(
      (accumulator, purchase) =>
        accumulator + purchase.total,
      0
    );

  /*
   * BALANCE DEL PERÍODO
   */

  const periodBalance =
    totalSales - totalPurchases;

  /*
   * ==========================================
   * CUENTAS POR COBRAR
   * ==========================================
   *
   * La cartera representa el estado ACTUAL
   * de las deudas, por lo que no se limita
   * al rango de fechas del reporte.
   */

  const pendingReceivables =
    accountsReceivable.filter(
      (account) =>
        account.status !== "PAID"
    );

  const totalReceivableBalance =
    pendingReceivables.reduce(
      (accumulator, account) =>
        accumulator + account.balance,
      0
    );

  const totalReceivablePaid =
    accountsReceivable.reduce(
      (accumulator, account) =>
        accumulator + account.paidAmount,
      0
    );

  const overdueReceivables =
    pendingReceivables.filter(
      (account) =>
        account.dueDate < today
    );

  /*
   * ==========================================
   * DATOS PARA EXCEL
   * ==========================================
   */

  const exportProducts = products.map(
    (product) => ({
      code: product.code,
      name: product.name,
      brand: product.brand,
      category:
        product.category?.name || null,
      supplier:
        product.supplier?.name || null,
      stock: product.stock,
      minStock: product.minStock,
      priceCost: product.priceCost,
      priceSale: product.priceSale,
    })
  );

  const exportSales = sales.map((sale) => ({
    id: sale.id,

    createdAt:
      sale.createdAt.toISOString(),

    customer:
      sale.customer?.name ||
      "Consumidor final",

    total: sale.total,

    items: sale.items.map((item) => ({
      productCode: item.product.code,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
  }));

  const exportPurchases = purchases.map(
    (purchase) => ({
      id: purchase.id,

      purchaseNumber:
        purchase.purchaseNumber,

      purchaseDate:
        purchase.purchaseDate.toISOString(),

      supplier:
        purchase.supplier.name,

      status:
        purchase.status,

      notes:
        purchase.notes,

      total:
        purchase.total,

      items: purchase.items.map(
        (item) => ({
          productCode:
            item.product.code,

          productName:
            item.product.name,

          quantity:
            item.quantity,

          unitCost:
            item.unitCost,

          subtotal:
            item.subtotal,
        })
      ),
    })
  );

  const exportReceivables =
    accountsReceivable.map(
      (account) => ({
        id: account.id,

        saleId:
          account.saleId,

        customer:
          account.customer.name,

        createdAt:
          account.createdAt.toISOString(),

        dueDate:
          account.dueDate.toISOString(),

        originalAmount:
          account.originalAmount,

        paidAmount:
          account.paidAmount,

        balance:
          account.balance,

        status:
          account.status,
      })
    );

  /*
   * ==========================================
   * TEXTO DEL PERÍODO
   * ==========================================
   */

  let periodLabel = "Histórico completo";

  if (
    periodStart &&
    periodEndExclusive
  ) {
    const inclusiveEnd =
      new Date(periodEndExclusive);

    inclusiveEnd.setDate(
      inclusiveEnd.getDate() - 1
    );

    periodLabel = `${formatPeriodDate(
      periodStart
    )} - ${formatPeriodDate(
      inclusiveEnd
    )}`;
  } else if (periodStart) {
    periodLabel = `Desde ${formatPeriodDate(
      periodStart
    )}`;
  } else if (periodEndExclusive) {
    const inclusiveEnd =
      new Date(periodEndExclusive);

    inclusiveEnd.setDate(
      inclusiveEnd.getDate() - 1
    );

    periodLabel = `Hasta ${formatPeriodDate(
      inclusiveEnd
    )}`;
  }

  /*
   * ==========================================
   * MÉTRICAS
   * ==========================================
   */

  const metrics = [
    {
      label: "Productos registrados",

      value:
        products.length.toLocaleString(
          "es-GT"
        ),

      description:
        "Total actual de artículos existentes.",

      icon: Package,

      iconClass:
        "bg-slate-100 text-slate-700",
    },

    {
      label: "Stock crítico",

      value:
        lowStockProducts.length.toLocaleString(
          "es-GT"
        ),

      description: `${outOfStockProducts.length} producto${
        outOfStockProducts.length === 1
          ? ""
          : "s"
      } agotado${
        outOfStockProducts.length === 1
          ? ""
          : "s"
      }.`,

      icon: AlertTriangle,

      iconClass:
        lowStockProducts.length > 0
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700",
    },

    {
      label: "Costo del inventario",

      value: formatMoney(
        totalInventoryCost,
        currencySymbol
      ),

      description:
        "Valor actual a precio de costo.",

      icon: Boxes,

      iconClass:
        "bg-blue-100 text-blue-700",
    },

    {
      label: "Total vendido",

      value: formatMoney(
        totalSales,
        currencySymbol
      ),

      description: `${sales.length} venta${
        sales.length === 1 ? "" : "s"
      } en el período.`,

      icon: Wallet,

      iconClass:
        "bg-green-100 text-green-700",
    },

    {
      label: "Total comprado",

      value: formatMoney(
        totalPurchases,
        currencySymbol
      ),

      description: `${completedPurchases.length} compra${
        completedPurchases.length === 1
          ? ""
          : "s"
      } completada${
        completedPurchases.length === 1
          ? ""
          : "s"
      } en el período.`,

      icon: ShoppingCart,

      iconClass:
        "bg-indigo-100 text-indigo-700",
    },

    {
      label: "Balance del período",

      value: formatMoney(
        periodBalance,
        currencySymbol
      ),

      description:
        "Ventas menos compras completadas.",

      icon: TrendingUp,

      iconClass:
        periodBalance >= 0
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700",
    },

    {
      label: "Saldo por cobrar",

      value: formatMoney(
        totalReceivableBalance,
        currencySymbol
      ),

      description: `${pendingReceivables.length} cuenta${
        pendingReceivables.length === 1
          ? ""
          : "s"
      } pendiente${
        pendingReceivables.length === 1
          ? ""
          : "s"
      } actualmente.`,

      icon: Wallet,

      iconClass:
        overdueReceivables.length > 0
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700",
    },

    {
      label: "Cuentas vencidas",

      value:
        overdueReceivables.length.toLocaleString(
          "es-GT"
        ),

      description:
        overdueReceivables.length > 0
          ? "Requieren seguimiento de cobro."
          : "No existen cuentas vencidas.",

      icon: AlertTriangle,

      iconClass:
        overdueReceivables.length > 0
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700",
    },

    {
      label: "Total abonado",

      value: formatMoney(
        totalReceivablePaid,
        currencySymbol
      ),

      description:
        "Abonos acumulados registrados en la cartera.",

      icon: Wallet,

      iconClass:
        "bg-emerald-100 text-emerald-700",
    },
  ];

  const quickFilters = [
    {
      label: "Todo",
      value: "todo",
      href: "/reportes",
    },
    {
      label: "Hoy",
      value: "hoy",
      href: "/reportes?periodo=hoy",
    },
    {
      label: "7 días",
      value: "7dias",
      href: "/reportes?periodo=7dias",
    },
    {
      label: "30 días",
      value: "30dias",
      href: "/reportes?periodo=30dias",
    },
    {
      label: "Este mes",
      value: "mes",
      href: "/reportes?periodo=mes",
    },
    {
      label: "Este año",
      value: "anio",
      href: "/reportes?periodo=anio",
    },
  ];

  const isCustomFilter =
    selectedPeriod === "personalizado" ||
    Boolean(params.desde) ||
    Boolean(params.hasta);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8">
          <p className="mb-1 text-sm font-semibold text-green-700">
            Análisis del negocio
          </p>

          <h1 className="text-3xl font-bold text-slate-900">
            Reportes
          </h1>

          <p className="mt-1 text-slate-500">
            Consulta y exporta información de inventario,
            ventas y compras.
          </p>
        </header>

        {/* ======================================
            FILTROS
        ====================================== */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={20}
                  className="text-blue-700"
                />

                <h2 className="text-xl font-bold text-slate-900">
                  Período de análisis
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Filtra las ventas y compras que deseas
                consultar o exportar.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Período actual
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {periodLabel}
              </p>
            </div>
          </div>

          {/* FILTROS RÁPIDOS */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Acceso rápido
            </p>

            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => {
                const active =
                  !isCustomFilter &&
                  selectedPeriod === filter.value;

                return (
                  <Link
                    key={filter.value}
                    href={filter.href}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* RANGO PERSONALIZADO */}
          <form
            method="GET"
            action="/reportes"
            className="border-t border-slate-200 pt-5"
          >
            <input
              type="hidden"
              name="periodo"
              value="personalizado"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
              <div>
                <label
                  htmlFor="desde"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Desde
                </label>

                <input
                  id="desde"
                  name="desde"
                  type="date"
                  defaultValue={params.desde || ""}
                  max={getDateInputValue(today)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="hasta"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Hasta
                </label>

                <input
                  id="hasta"
                  name="hasta"
                  type="date"
                  defaultValue={params.hasta || ""}
                  max={getDateInputValue(today)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <Filter size={17} />
                Aplicar filtro
              </button>

              <Link
                href="/reportes"
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <RotateCcw size={17} />
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        {/* ======================================
            MÉTRICAS
        ====================================== */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.iconClass}`}
                  >
                    <Icon size={20} />
                  </div>
                </div>

                <p className="text-2xl font-bold text-slate-900">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {metric.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* ======================================
            EXPORTACIONES
        ====================================== */}
        <ReportExportButtons
          products={exportProducts}
          sales={exportSales}
          purchases={exportPurchases}
          receivables={exportReceivables}
          businessName={businessName}
          currency={currency}
        />

        {/* ======================================
            CUENTAS POR COBRAR
        ====================================== */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Cuentas por cobrar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Estado actual de la cartera de clientes a crédito.
                Este resumen no se limita al período seleccionado.
              </p>
            </div>

            <Link
              href="/cuentas-por-cobrar"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver cartera
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-center">Venta</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Abonado</th>
                  <th className="p-4 text-right">Saldo</th>
                  <th className="p-4 text-left">Vencimiento</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {pendingReceivables
                  .slice(0, 10)
                  .map((account) => {
                    const isOverdue =
                      account.dueDate < today;

                    const statusLabel =
                      isOverdue
                        ? "Vencida"
                        : account.status === "PARTIAL"
                          ? "Parcial"
                          : "Pendiente";

                    const statusClass =
                      isOverdue
                        ? "bg-red-100 text-red-700"
                        : account.status === "PARTIAL"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700";

                    return (
                      <tr
                        key={account.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="p-4 font-medium text-slate-900">
                          {account.customer.name}
                        </td>

                        <td className="p-4 text-center text-slate-600">
                          #{account.saleId}
                        </td>

                        <td className="p-4 text-right">
                          {formatMoney(
                            account.originalAmount,
                            currencySymbol
                          )}
                        </td>

                        <td className="p-4 text-right text-green-700">
                          {formatMoney(
                            account.paidAmount,
                            currencySymbol
                          )}
                        </td>

                        <td className="p-4 text-right font-bold text-red-700">
                          {formatMoney(
                            account.balance,
                            currencySymbol
                          )}
                        </td>

                        <td className="p-4 text-slate-600">
                          {formatPeriodDate(
                            account.dueDate
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                {pendingReceivables.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-10 text-center text-slate-500"
                    >
                      No existen cuentas por cobrar pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pendingReceivables.length > 10 && (
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
              Mostrando las 10 cuentas pendientes más próximas.
              La cartera completa está disponible en el módulo de
              cuentas por cobrar.
            </div>
          )}
        </section>

        {/* ======================================
            STOCK CRÍTICO
        ====================================== */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Productos con stock crítico
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Estado actual de productos agotados o con
                existencias iguales o inferiores al mínimo
                configurado.
              </p>
            </div>

            <span className="w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              {lowStockProducts.length} producto
              {lowStockProducts.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
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
                    Mínimo
                  </th>
                </tr>
              </thead>

              <tbody>
                {lowStockProducts.map(
                  (product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="p-4 font-medium text-slate-900">
                        {product.code}
                      </td>

                      <td className="p-4">
                        {product.name}
                      </td>

                      <td className="p-4 text-slate-600">
                        {product.category?.name ||
                          "Sin categoría"}
                      </td>

                      <td className="p-4 text-slate-600">
                        {product.supplier?.name ||
                          "Sin proveedor"}
                      </td>

                      <td className="p-4 text-right">
                        <span
                          className={`font-bold ${
                            product.stock === 0
                              ? "text-red-700"
                              : "text-amber-700"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        {product.minStock}
                      </td>
                    </tr>
                  )
                )}

                {lowStockProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-500"
                    >
                      No hay productos con stock crítico.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ======================================
            VENTAS Y COMPRAS
        ====================================== */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* VENTAS */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Ventas del período
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Operaciones encontradas según el filtro
                  seleccionado.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                {sales.length} venta
                {sales.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-4 text-left">
                      Fecha
                    </th>

                    <th className="p-4 text-left">
                      Cliente
                    </th>

                    <th className="p-4 text-center">
                      Productos
                    </th>

                    <th className="p-4 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sales
                    .slice(0, 10)
                    .map((sale) => (
                      <tr
                        key={sale.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="p-4 text-slate-600">
                          {new Date(
                            sale.createdAt
                          ).toLocaleString(
                            "es-GT"
                          )}
                        </td>

                        <td className="p-4 font-medium text-slate-900">
                          {sale.customer?.name ||
                            "Consumidor final"}
                        </td>

                        <td className="p-4 text-center">
                          {sale.items.length}
                        </td>

                        <td className="p-4 text-right font-bold text-green-700">
                          {formatMoney(
                            sale.total,
                            currencySymbol
                          )}
                        </td>
                      </tr>
                    ))}

                  {sales.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-500"
                      >
                        No existen ventas durante el período
                        seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {sales.length > 10 && (
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
                Mostrando las 10 operaciones más recientes de{" "}
                {sales.length}. El Excel incluye todas.
              </div>
            )}
          </div>

          {/* COMPRAS */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Compras del período
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Operaciones encontradas según el filtro
                  seleccionado.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {purchases.length} compra
                {purchases.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-4 text-left">
                      Compra
                    </th>

                    <th className="p-4 text-left">
                      Fecha
                    </th>

                    <th className="p-4 text-left">
                      Proveedor
                    </th>

                    <th className="p-4 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {purchases
                    .slice(0, 10)
                    .map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="p-4 font-medium text-slate-900">
                          {purchase.purchaseNumber}
                        </td>

                        <td className="p-4 text-slate-600">
                          {new Date(
                            purchase.purchaseDate
                          ).toLocaleString(
                            "es-GT"
                          )}
                        </td>

                        <td className="p-4">
                          {purchase.supplier.name}
                        </td>

                        <td className="p-4 text-right font-bold text-blue-700">
                          {formatMoney(
                            purchase.total,
                            currencySymbol
                          )}
                        </td>
                      </tr>
                    ))}

                  {purchases.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-500"
                      >
                        No existen compras durante el período
                        seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {purchases.length > 10 && (
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-xs text-slate-500">
                Mostrando las 10 operaciones más recientes de{" "}
                {purchases.length}. El Excel incluye todas.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}