import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import SalesChart from "@/components/SalesChart";
import QuickActions from "@/components/QuickActions";
import SystemAlerts from "@/components/SystemAlerts";
import RecentActivity from "@/components/RecentActivity";

import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  CircleCheck,
  CircleX,
  Crown,
  Package,
  ReceiptText,
  Scale,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

type UserRole =
  | "ADMIN"
  | "SELLER"
  | "VIEWER";

function formatCurrency(
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
  date: Date
) {
  return new Intl.DateTimeFormat(
    "es-GT",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function getLocalDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function DashboardPage() {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   */

  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
      "VIEWER",
    ]);

  if (!auth.ok) {
    redirect("/");
  }

  const role =
    auth.session
      .role as UserRole;

  /*
   * ==========================================
   * PERMISOS DEL DASHBOARD
   * ==========================================
   */

  const canViewPurchases =
    role === "ADMIN" ||
    role === "VIEWER";

  const canAccessSales =
    role === "ADMIN" ||
    role === "SELLER";

  const canAccessPurchases =
    role === "ADMIN";

  /*
   * ==========================================
   * FECHAS
   * ==========================================
   */

  const today =
    new Date();

  const startOfDay =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const startOfTomorrow =
    new Date(
      startOfDay
    );

  startOfTomorrow.setDate(
    startOfTomorrow.getDate() +
      1
  );

  const startOfMonth =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

  const startOfNextMonth =
    new Date(
      today.getFullYear(),
      today.getMonth() +
        1,
      1
    );

  const startOfYear =
    new Date(
      today.getFullYear(),
      0,
      1
    );

  const thirtyDaysAgo =
    new Date(
      startOfDay
    );

  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() -
      29
  );

  const chartStartDate =
    thirtyDaysAgo <
    startOfYear
      ? thirtyDaysAgo
      : startOfYear;

  /*
   * ==========================================
   * CONSULTAS GENERALES
   * ==========================================
   */

  const [
    business,
    products,
    totalCustomers,
    sales,
    salesToday,
    salesThisMonth,
    recentSales,
    lastCustomer,
    accountsReceivable,
  ] = await Promise.all([
    prisma.businessConfig.findFirst(),

    prisma.product.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.customer.count(),

    prisma.sale.findMany({
      include: {
        customer: true,

        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.sale.findMany({
      where: {
        createdAt: {
          gte:
            startOfDay,

          lt:
            startOfTomorrow,
        },
      },
    }),

    prisma.sale.findMany({
      where: {
        createdAt: {
          gte:
            startOfMonth,

          lt:
            startOfNextMonth,
        },
      },
    }),

    prisma.sale.findMany({
      include: {
        customer: true,
        items: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,
    }),

    prisma.customer.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.accountReceivable.findMany({
      where: {
        status: {
          not: "PAID",
        },
      },

      include: {
        customer: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  /*
   * ==========================================
   * CONSULTAS SENSIBLES
   * ==========================================
   *
   * SELLER no necesita consultar:
   * - compras
   * - proveedores
   * - costos asociados a compras
   */

  const [
    totalSuppliers,
    purchases,
    purchasesToday,
    purchasesThisMonth,
    recentPurchases,
    lastSupplier,
  ] = canViewPurchases
    ? await Promise.all([
        prisma.supplier.count(),

        prisma.purchase.findMany({
          where: {
            status:
              "COMPLETED",
          },

          include: {
            supplier: true,
            items: true,
          },

          orderBy: {
            purchaseDate:
              "desc",
          },
        }),

        prisma.purchase.findMany({
          where: {
            status:
              "COMPLETED",

            purchaseDate: {
              gte:
                startOfDay,

              lt:
                startOfTomorrow,
            },
          },
        }),

        prisma.purchase.findMany({
          where: {
            status:
              "COMPLETED",

            purchaseDate: {
              gte:
                startOfMonth,

              lt:
                startOfNextMonth,
            },
          },
        }),

        prisma.purchase.findMany({
          where: {
            status:
              "COMPLETED",
          },

          include: {
            supplier: true,
            items: true,
          },

          orderBy: {
            purchaseDate:
              "desc",
          },

          take: 5,
        }),

        prisma.supplier.findFirst({
          orderBy: {
            createdAt:
              "desc",
          },
        }),
      ])
    : [
        0,
        [],
        [],
        [],
        [],
        null,
      ];

  /*
   * ==========================================
   * ÚLTIMO ABONO
   * ==========================================
   *
   * Solo ADMIN y SELLER pueden visualizar
   * la actividad de cuentas por cobrar.
   */

  const lastReceivablePayment =
    canAccessSales
      ? await prisma.receivablePayment.findFirst({
          include: {
            accountReceivable: {
              include: {
                customer: true,
              },
            },
          },

          orderBy: {
            paymentDate: "desc",
          },
        })
      : null;

  /*
   * ==========================================
   * NEGOCIO
   * ==========================================
   */

  const businessName =
    business?.name ||
    "ControlStock Pro";

  const currencySymbol =
    business?.currency ===
    "USD"
      ? "$"
      : business?.currency ===
          "EUR"
        ? "€"
        : "Q";

  /*
   * ==========================================
   * INVENTARIO
   * ==========================================
   */

  const totalProducts =
    products.length;

  const outOfStock =
    products.filter(
      (product) =>
        product.stock === 0
    ).length;

  const lowStock =
    products.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <=
          product.minStock
    ).length;

  const availableProducts =
    products.filter(
      (product) =>
        product.stock >
        product.minStock
    ).length;

  const criticalStock =
    outOfStock +
    lowStock;

  const recentProducts =
    products.slice(0, 5);

  /*
   * ==========================================
   * VALORES DEL INVENTARIO
   * ==========================================
   *
   * Solo serán mostrados a ADMIN/VIEWER.
   */

  const inventoryCost =
    canViewPurchases
      ? products.reduce(
          (
            accumulator,
            product
          ) =>
            accumulator +
            product.stock *
              product.priceCost,
          0
        )
      : 0;

  const inventoryValue =
    canViewPurchases
      ? products.reduce(
          (
            accumulator,
            product
          ) =>
            accumulator +
            product.stock *
              product.priceSale,
          0
        )
      : 0;

  const potentialProfit =
    inventoryValue -
    inventoryCost;

  /*
   * ==========================================
   * VENTAS
   * ==========================================
   */

  const totalSales =
    sales.reduce(
      (
        accumulator,
        sale
      ) =>
        accumulator +
        sale.total,
      0
    );

  const totalSalesToday =
    salesToday.reduce(
      (
        accumulator,
        sale
      ) =>
        accumulator +
        sale.total,
      0
    );

  const totalSalesThisMonth =
    salesThisMonth.reduce(
      (
        accumulator,
        sale
      ) =>
        accumulator +
        sale.total,
      0
    );

  const averageTicket =
    sales.length === 0
      ? 0
      : totalSales /
        sales.length;

  /*
   * ==========================================
   * COMPRAS
   * ==========================================
   */

  const totalPurchases =
    canViewPurchases
      ? purchases.reduce(
          (
            accumulator,
            purchase
          ) =>
            accumulator +
            purchase.total,
          0
        )
      : 0;

  const totalPurchasesToday =
    canViewPurchases
      ? purchasesToday.reduce(
          (
            accumulator,
            purchase
          ) =>
            accumulator +
            purchase.total,
          0
        )
      : 0;

  const totalPurchasesThisMonth =
    canViewPurchases
      ? purchasesThisMonth.reduce(
          (
            accumulator,
            purchase
          ) =>
            accumulator +
            purchase.total,
          0
        )
      : 0;

  const commercialResultThisMonth =
    totalSalesThisMonth -
    totalPurchasesThisMonth;

  /*
   * ==========================================
   * PRODUCTO MÁS VENDIDO
   * ==========================================
   */

  const productSalesMap =
    new Map<
      number,
      {
        name: string;
        quantity: number;
      }
    >();

  sales.forEach(
    (sale) => {
      sale.items.forEach(
        (item) => {
          const current =
            productSalesMap.get(
              item.productId
            );

          productSalesMap.set(
            item.productId,
            {
              name:
                item.product.name,

              quantity:
                (current?.quantity ||
                  0) +
                item.quantity,
            }
          );
        }
      );
    }
  );

  const topProduct =
    Array.from(
      productSalesMap.values()
    ).sort(
      (a, b) =>
        b.quantity -
        a.quantity
    )[0];

  /*
   * ==========================================
   * CLIENTE PRINCIPAL
   * ==========================================
   */

  const customerSalesMap =
    new Map<
      number,
      {
        name: string;
        total: number;
      }
    >();

  sales.forEach(
    (sale) => {
      if (
        !sale.customerId ||
        !sale.customer
      ) {
        return;
      }

      const current =
        customerSalesMap.get(
          sale.customerId
        );

      customerSalesMap.set(
        sale.customerId,
        {
          name:
            sale.customer.name,

          total:
            (current?.total ||
              0) +
            sale.total,
        }
      );
    }
  );

  const topCustomer =
    Array.from(
      customerSalesMap.values()
    ).sort(
      (a, b) =>
        b.total -
        a.total
    )[0];

  /*
   * ==========================================
   * PROVEEDOR PRINCIPAL
   * ==========================================
   */

  const supplierPurchasesMap =
    new Map<
      number,
      {
        name: string;
        total: number;
        purchases: number;
      }
    >();

  if (
    canViewPurchases
  ) {
    purchases.forEach(
      (purchase) => {
        const current =
          supplierPurchasesMap.get(
            purchase.supplierId
          );

        supplierPurchasesMap.set(
          purchase.supplierId,
          {
            name:
              purchase.supplier
                .name,

            total:
              (current?.total ||
                0) +
              purchase.total,

            purchases:
              (current?.purchases ||
                0) + 1,
          }
        );
      }
    );
  }

  const topSupplier =
    canViewPurchases
      ? Array.from(
          supplierPurchasesMap.values()
        ).sort(
          (a, b) =>
            b.total -
            a.total
        )[0]
      : undefined;

  /*
   * ==========================================
   * GRÁFICA
   * ==========================================
   */

  const salesByDate =
    new Map<
      string,
      number
    >();

  const purchasesByDate =
    new Map<
      string,
      number
    >();

  sales.forEach(
    (sale) => {
      const saleDate =
        new Date(
          sale.createdAt
        );

      if (
        saleDate <
          chartStartDate ||
        saleDate >=
          startOfTomorrow
      ) {
        return;
      }

      const dateKey =
        getLocalDateKey(
          saleDate
        );

      salesByDate.set(
        dateKey,
        (salesByDate.get(
          dateKey
        ) || 0) +
          sale.total
      );
    }
  );

  if (
    canViewPurchases
  ) {
    purchases.forEach(
      (purchase) => {
        const purchaseDate =
          new Date(
            purchase.purchaseDate
          );

        if (
          purchaseDate <
            chartStartDate ||
          purchaseDate >=
            startOfTomorrow
        ) {
          return;
        }

        const dateKey =
          getLocalDateKey(
            purchaseDate
          );

        purchasesByDate.set(
          dateKey,
          (purchasesByDate.get(
            dateKey
          ) || 0) +
            purchase.total
        );
      }
    );
  }

  const chartData: {
    date: string;
    sales: number;
    purchases: number;
  }[] = [];

  const chartCurrentDate =
    new Date(
      chartStartDate
    );

  while (
    chartCurrentDate <=
    startOfDay
  ) {
    const dateKey =
      getLocalDateKey(
        chartCurrentDate
      );

    chartData.push({
      date:
        dateKey,

      sales:
        salesByDate.get(
          dateKey
        ) || 0,

      purchases:
        canViewPurchases
          ? purchasesByDate.get(
              dateKey
            ) || 0
          : 0,
    });

    chartCurrentDate.setDate(
      chartCurrentDate.getDate() +
        1
    );
  }

  /*
   * ==========================================
   * TARJETAS PRINCIPALES
   * ==========================================
   */

  /*
   * ==========================================
   * CUENTAS POR COBRAR
   * ==========================================
   */

  const totalReceivableBalance =
    accountsReceivable.reduce(
      (total, account) =>
        total + account.balance,
      0
    );


  const overdueReceivableAccounts =
    accountsReceivable.filter(
      (account) =>
        new Date(account.dueDate) < today
    ).length;


  const cards = [
    {
      label:
        "Productos",

      value:
        totalProducts.toLocaleString(
          "es-GT"
        ),

      description:
        totalProducts === 1
          ? "Producto registrado"
          : "Productos registrados",

      icon:
        Package,

      className:
        "bg-white text-slate-900",

      iconClass:
        "bg-slate-100 text-slate-700",

      descriptionClass:
        "text-slate-500",
    },

    {
      label:
        "Stock crítico",

      value:
        criticalStock.toLocaleString(
          "es-GT"
        ),

      description:
        criticalStock === 0
          ? "Sin productos críticos"
          : `${outOfStock} agotado${
              outOfStock ===
              1
                ? ""
                : "s"
            } y ${lowStock} con stock bajo`,

      icon:
        AlertTriangle,

      className:
        criticalStock > 0
          ? "bg-white text-red-600"
          : "bg-white text-green-700",

      iconClass:
        criticalStock > 0
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700",

      descriptionClass:
        criticalStock > 0
          ? "text-red-500"
          : "text-green-600",
    },

    {
      label:
        "Ventas hoy",

      value:
        formatCurrency(
          totalSalesToday,
          currencySymbol
        ),

      description:
        salesToday.length ===
        1
          ? "1 venta registrada"
          : `${salesToday.length} ventas registradas`,

      icon:
        Wallet,

      className:
        "bg-green-600 text-white",

      iconClass:
        "bg-white/20 text-white",

      descriptionClass:
        "text-white/70",
    },

    ...(canAccessSales
      ? [
          {
            label:
              "Cuentas por cobrar",

            value:
              formatCurrency(
                totalReceivableBalance,
                currencySymbol
              ),

            description:
              accountsReceivable.length === 0
                ? "Sin saldos pendientes"
                : `${accountsReceivable.length} cuenta${
                    accountsReceivable.length === 1
                      ? ""
                      : "s"
                  } pendiente${
                    accountsReceivable.length === 1
                      ? ""
                      : "s"
                  }`,

            icon:
              Wallet,

            className:
              "bg-red-600 text-white",

            iconClass:
              "bg-white/20 text-white",

            descriptionClass:
              "text-white/70",
          },
        ]
      : []),

    ...(canViewPurchases
      ? [
          {
            label:
              "Compras hoy",

            value:
              formatCurrency(
                totalPurchasesToday,
                currencySymbol
              ),

            description:
              purchasesToday.length ===
              1
                ? "1 compra completada"
                : `${purchasesToday.length} compras completadas`,

            icon:
              ShoppingCart,

            className:
              "bg-blue-600 text-white",

            iconClass:
              "bg-white/20 text-white",

            descriptionClass:
              "text-white/70",
          },
        ]
      : []),

    {
      label:
        "Clientes",

      value:
        totalCustomers.toLocaleString(
          "es-GT"
        ),

      description:
        totalCustomers ===
        1
          ? "Cliente registrado"
          : "Clientes registrados",

      icon:
        Users,

      className:
        "bg-white text-slate-900",

      iconClass:
        "bg-slate-100 text-slate-700",

      descriptionClass:
        "text-slate-500",
    },

    ...(canViewPurchases
      ? [
          {
            label:
              "Proveedores",

            value:
              totalSuppliers.toLocaleString(
                "es-GT"
              ),

            description:
              totalSuppliers ===
              1
                ? "Proveedor registrado"
                : "Proveedores registrados",

            icon:
              Truck,

            className:
              "bg-white text-slate-900",

            iconClass:
              "bg-slate-100 text-slate-700",

            descriptionClass:
              "text-slate-500",
          },
        ]
      : []),
  ];

  /*
   * ==========================================
   * MÉTRICAS
   * ==========================================
   */

  const businessMetrics = [
    {
      label:
        "Saldo pendiente de cobro",

      value:
        formatCurrency(
          totalReceivableBalance,
          currencySymbol
        ),

      description:
        overdueReceivableAccounts > 0
          ? `${overdueReceivableAccounts} cuenta${
              overdueReceivableAccounts === 1
                ? ""
                : "s"
            } vencida${
              overdueReceivableAccounts === 1
                ? ""
                : "s"
            }.`
          : "No existen cuentas vencidas.",

      icon:
        Wallet,

      iconClass:
        overdueReceivableAccounts > 0
          ? "bg-red-100 text-red-700"
          : "bg-green-100 text-green-700",
    },

    {
      label:
        "Ventas del mes",

      value:
        formatCurrency(
          totalSalesThisMonth,
          currencySymbol
        ),

      description: `${
        salesThisMonth.length
      } venta${
        salesThisMonth.length ===
        1
          ? ""
          : "s"
      } durante el mes actual.`,

      icon:
        BadgeDollarSign,

      iconClass:
        "bg-green-100 text-green-700",
    },

    {
      label:
        "Ticket promedio",

      value:
        formatCurrency(
          averageTicket,
          currencySymbol
        ),

      description:
        "Promedio económico de todas las ventas registradas.",

      icon:
        ReceiptText,

      iconClass:
        "bg-amber-100 text-amber-700",
    },

    ...(canViewPurchases
      ? [
          {
            label:
              "Compras del mes",

            value:
              formatCurrency(
                totalPurchasesThisMonth,
                currencySymbol
              ),

            description: `${
              purchasesThisMonth.length
            } compra${
              purchasesThisMonth.length ===
              1
                ? ""
                : "s"
            } completada${
              purchasesThisMonth.length ===
              1
                ? ""
                : "s"
            } durante el mes.`,

            icon:
              ShoppingCart,

            iconClass:
              "bg-blue-100 text-blue-700",
          },

          {
            label:
              "Balance comercial del mes",

            value:
              formatCurrency(
                commercialResultThisMonth,
                currencySymbol
              ),

            description:
              "Diferencia entre las ventas y las compras del mes.",

            icon:
              Scale,

            iconClass:
              commercialResultThisMonth >=
              0
                ? "bg-violet-100 text-violet-700"
                : "bg-red-100 text-red-700",
          },

          {
            label:
              "Costo del inventario",

            value:
              formatCurrency(
                inventoryCost,
                currencySymbol
              ),

            description:
              "Stock actual valorado al precio de costo.",

            icon:
              Warehouse,

            iconClass:
              "bg-slate-100 text-slate-700",
          },

          {
            label:
              "Valor de venta",

            value:
              formatCurrency(
                inventoryValue,
                currencySymbol
              ),

            description:
              "Valor estimado del inventario al precio de venta.",

            icon:
              Boxes,

            iconClass:
              "bg-cyan-100 text-cyan-700",
          },

          {
            label:
              "Ganancia potencial",

            value:
              formatCurrency(
                potentialProfit,
                currencySymbol
              ),

            description:
              "Diferencia entre el valor de venta y el costo del inventario.",

            icon:
              TrendingUp,

            iconClass:
              "bg-emerald-100 text-emerald-700",
          },

          {
            label:
              "Total comprado",

            value:
              formatCurrency(
                totalPurchases,
                currencySymbol
              ),

            description: `${
              purchases.length
            } compra${
              purchases.length ===
              1
                ? ""
                : "s"
            } completada${
              purchases.length ===
              1
                ? ""
                : "s"
            } históricamente.`,

            icon:
              CalendarDays,

            iconClass:
              "bg-indigo-100 text-indigo-700",
          },
        ]
      : []),
  ];

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}

        <header className="mb-8">
          <p className="mb-1 text-sm font-semibold text-green-700">
            Panel principal
          </p>

          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {
              businessName
            }
          </h1>

          <p className="mt-1 text-slate-600">
            {role ===
            "SELLER"
              ? "Control de inventario, ventas, clientes y operaciones comerciales."
              : "Control general de inventario, ventas, compras y operaciones del negocio."}
          </p>
        </header>

        {/* TARJETAS */}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map(
            (card) => {
              const Icon =
                card.icon;

              return (
                <div
                  key={
                    card.label
                  }
                  className={`${card.className} rounded-2xl p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p
                      className={`text-sm ${
                        card.className.includes(
                          "text-white"
                        )
                          ? "text-white/80"
                          : "text-slate-500"
                      }`}
                    >
                      {
                        card.label
                      }
                    </p>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}
                    >
                      <Icon
                        size={
                          20
                        }
                      />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold xl:text-3xl">
                    {
                      card.value
                    }
                  </h2>

                  <p
                    className={`mt-2 text-xs font-medium ${card.descriptionClass}`}
                  >
                    {
                      card.description
                    }
                  </p>
                </div>
              );
            }
          )}
        </section>

        {/* INVENTARIO */}

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CircleCheck
                size={21}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-green-800">
                Disponibles
              </p>

              <p className="text-2xl font-bold text-green-900">
                {
                  availableProducts
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <TriangleAlert
                size={21}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Stock bajo
              </p>

              <p className="text-2xl font-bold text-amber-900">
                {
                  lowStock
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <CircleX
                size={21}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-red-800">
                Agotados
              </p>

              <p className="text-2xl font-bold text-red-900">
                {
                  outOfStock
                }
              </p>
            </div>
          </div>
        </section>

        {/* MÉTRICAS */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Métricas del negocio
            </h2>

            <p className="text-sm text-slate-500">
              Indicadores disponibles según los permisos del usuario.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {businessMetrics.map(
              (metric) => {
                const Icon =
                  metric.icon;

                return (
                  <div
                    key={
                      metric.label
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        {
                          metric.label
                        }
                      </p>

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.iconClass}`}
                      >
                        <Icon
                          size={
                            21
                          }
                        />
                      </div>
                    </div>

                    <p className="text-2xl font-bold text-slate-900">
                      {
                        metric.value
                      }
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {
                        metric.description
                      }
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* DESTACADOS */}

        <section
          className={`mt-6 grid grid-cols-1 gap-4 ${
            canViewPurchases
              ? "md:grid-cols-3"
              : "md:grid-cols-2"
          }`}
        >
          {/* PRODUCTO */}

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                <Trophy
                  size={20}
                />
              </div>

              <h3 className="font-bold text-yellow-900">
                Producto más vendido
              </h3>
            </div>

            <p className="font-semibold text-yellow-900">
              {topProduct?.name ||
                "Sin información"}
            </p>

            <p className="mt-1 text-sm text-yellow-700">
              {topProduct
                ? `${
                    topProduct.quantity
                  } unidad${
                    topProduct.quantity ===
                    1
                      ? ""
                      : "es"
                  } vendida${
                    topProduct.quantity ===
                    1
                      ? ""
                      : "s"
                  }`
                : "Aún no existen ventas registradas."}
            </p>
          </div>

          {/* CLIENTE */}

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Crown
                  size={20}
                />
              </div>

              <h3 className="font-bold text-violet-900">
                Cliente principal
              </h3>
            </div>

            <p className="font-semibold text-violet-900">
              {topCustomer?.name ||
                "Sin información"}
            </p>

            <p className="mt-1 text-sm text-violet-700">
              {topCustomer
                ? `${formatCurrency(
                    topCustomer.total,
                    currencySymbol
                  )} en compras`
                : "Aún no hay ventas asociadas a clientes."}
            </p>
          </div>

          {/* PROVEEDOR */}

          {canViewPurchases && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Truck
                    size={20}
                  />
                </div>

                <h3 className="font-bold text-blue-900">
                  Proveedor principal
                </h3>
              </div>

              <p className="font-semibold text-blue-900">
                {topSupplier?.name ||
                  "Sin información"}
              </p>

              <p className="mt-1 text-sm text-blue-700">
                {topSupplier
                  ? `${formatCurrency(
                      topSupplier.total,
                      currencySymbol
                    )} en ${
                      topSupplier.purchases
                    } compra${
                      topSupplier.purchases ===
                      1
                        ? ""
                        : "s"
                    }`
                  : "Aún no existen compras completadas."}
              </p>
            </div>
          )}
        </section>

        {/* ACCIONES */}

        <QuickActions
          role={role}
        />

        {/* ALERTAS */}

        <SystemAlerts
          lowStock={
            lowStock
          }
          outOfStock={
            outOfStock
          }
          salesTodayCount={
            salesToday.length
          }
          totalSalesToday={
            totalSalesToday
          }
          recentProductName={
            recentProducts[0]
              ?.name
          }
          lastSaleTotal={
            recentSales[0]
              ?.total
          }
          currencySymbol={
            currencySymbol
          }
          receivablesPending={
            canAccessSales
              ? accountsReceivable.length
              : 0
          }
          receivablesOverdue={
            canAccessSales
              ? overdueReceivableAccounts
              : 0
          }
        />

        {/* ACTIVIDAD */}

        <RecentActivity
          lastSale={
            recentSales[0]
              ? {
                  total:
                    recentSales[0]
                      .total,

                  createdAt:
                    recentSales[0]
                      .createdAt,

                  customerName:
                    recentSales[0]
                      .customer
                      ?.name ||
                    "Consumidor final",
                }
              : undefined
          }

          lastProduct={
            recentProducts[0]
              ? {
                  name:
                    recentProducts[0]
                      .name,

                  createdAt:
                    recentProducts[0]
                      .createdAt,
                }
              : undefined
          }

          lastCustomer={
            lastCustomer
              ? {
                  name:
                    lastCustomer.name,

                  createdAt:
                    lastCustomer.createdAt,
                }
              : undefined
          }

          lastSupplier={
            canViewPurchases &&
            lastSupplier
              ? {
                  name:
                    lastSupplier.name,

                  createdAt:
                    lastSupplier.createdAt,
                }
              : undefined
          }

          currencySymbol={
            currencySymbol
          }

          showSupplier={
            canViewPurchases
          }

          lastReceivablePayment={
            canAccessSales &&
            lastReceivablePayment
              ? {
                  amount:
                    lastReceivablePayment.amount,

                  paymentDate:
                    lastReceivablePayment.paymentDate,

                  customerName:
                    lastReceivablePayment
                      .accountReceivable
                      .customer
                      .name,
                }
              : undefined
          }
        />

        {/* GRÁFICA */}

        <section className="mt-8">
          <SalesChart
            data={
              chartData
            }
            currencySymbol={
              currencySymbol
            }
            showPurchases={
              canViewPurchases
            }
          />
        </section>

        {/* ACTIVIDAD OPERATIVA */}

        <section
          className={`mt-8 grid grid-cols-1 gap-6 ${
            canViewPurchases
              ? "xl:grid-cols-3"
              : "xl:grid-cols-2"
          }`}
        >
          {/* PRODUCTOS RECIENTES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Productos recientes
              </h2>

              <Link
                href="/productos"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Ver todos

                <ArrowRight
                  size={14}
                />
              </Link>
            </div>

            <div className="space-y-3">
              {recentProducts.map(
                (product) => (
                  <div
                    key={
                      product.id
                    }
                    className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {
                          product.name
                        }
                      </p>

                      <p className="text-sm text-slate-500">
                        Código:{" "}
                        {
                          product.code
                        }
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {product.stock ===
                      0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          <CircleX
                            size={
                              13
                            }
                          />

                          Agotado
                        </span>
                      ) : product.stock <=
                        product.minStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          <TriangleAlert
                            size={
                              13
                            }
                          />

                          Stock bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          <CircleCheck
                            size={
                              13
                            }
                          />

                          Disponible
                        </span>
                      )}

                      <span className="text-xs text-slate-500">
                        {
                          product.stock
                        }{" "}
                        unidad
                        {product.stock ===
                        1
                          ? ""
                          : "es"}
                      </span>
                    </div>
                  </div>
                )
              )}

              {recentProducts.length ===
                0 && (
                <div className="py-8 text-center">
                  <Package
                    className="mx-auto mb-2 text-slate-300"
                    size={32}
                  />

                  <p className="text-sm text-slate-500">
                    No hay productos registrados.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* VENTAS RECIENTES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Ventas recientes
              </h2>

              {canAccessSales && (
                <Link
                  href="/ventas/historial"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900"
                >
                  Ver historial

                  <ArrowRight
                    size={14}
                  />
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {recentSales.map(
                (sale) =>
                  canAccessSales ? (
                    <Link
                      key={
                        sale.id
                      }
                      href={`/ventas/${sale.id}`}
                      className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 transition hover:bg-slate-50 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {sale.customer
                            ?.name ||
                            "Consumidor final"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatDate(
                            sale.createdAt
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-bold text-green-700">
                          {formatCurrency(
                            sale.total,
                            currencySymbol
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            sale
                              .items
                              .length
                          }{" "}
                          producto
                          {sale.items
                            .length ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={
                        sale.id
                      }
                      className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {sale.customer
                            ?.name ||
                            "Consumidor final"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatDate(
                            sale.createdAt
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-bold text-green-700">
                          {formatCurrency(
                            sale.total,
                            currencySymbol
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          {
                            sale
                              .items
                              .length
                          }{" "}
                          producto
                          {sale.items
                            .length ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>
                    </div>
                  )
              )}

              {recentSales.length ===
                0 && (
                <div className="py-8 text-center">
                  <Wallet
                    className="mx-auto mb-2 text-slate-300"
                    size={32}
                  />

                  <p className="text-sm text-slate-500">
                    No hay ventas registradas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* COMPRAS RECIENTES */}

          {canViewPurchases && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Compras recientes
                </h2>

                {canAccessPurchases && (
                  <Link
                    href="/compras/historial"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Ver historial

                    <ArrowRight
                      size={
                        14
                      }
                    />
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                {recentPurchases.map(
                  (purchase) =>
                    canAccessPurchases ? (
                      <Link
                        key={
                          purchase.id
                        }
                        href={`/compras/${purchase.id}`}
                        className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 transition hover:bg-slate-50 last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {
                              purchase
                                .supplier
                                .name
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              purchase.purchaseNumber
                            }{" "}
                            ·{" "}
                            {formatDate(
                              purchase.purchaseDate
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-bold text-blue-700">
                            {formatCurrency(
                              purchase.total,
                              currencySymbol
                            )}
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              purchase
                                .items
                                .length
                            }{" "}
                            producto
                            {purchase
                              .items
                              .length ===
                            1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={
                          purchase.id
                        }
                        className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {
                              purchase
                                .supplier
                                .name
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              purchase.purchaseNumber
                            }{" "}
                            ·{" "}
                            {formatDate(
                              purchase.purchaseDate
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-bold text-blue-700">
                            {formatCurrency(
                              purchase.total,
                              currencySymbol
                            )}
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              purchase
                                .items
                                .length
                            }{" "}
                            producto
                            {purchase
                              .items
                              .length ===
                            1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                      </div>
                    )
                )}

                {recentPurchases.length ===
                  0 && (
                  <div className="py-8 text-center">
                    <ShoppingCart
                      className="mx-auto mb-2 text-slate-300"
                      size={
                        32
                      }
                    />

                    <p className="text-sm text-slate-500">
                      No hay compras completadas.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RESUMEN HISTÓRICO */}

        <section
          className={`mt-8 grid grid-cols-1 gap-4 ${
            canViewPurchases
              ? "md:grid-cols-2"
              : ""
          }`}
        >
          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-md">
            <p className="text-sm font-medium text-white/70">
              Total vendido históricamente
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(
                totalSales,
                currencySymbol
              )}
            </p>

            <p className="mt-2 text-sm text-white/60">
              {
                sales.length
              }{" "}
              venta
              {sales.length ===
              1
                ? ""
                : "s"}{" "}
              registrada
              {sales.length ===
              1
                ? ""
                : "s"}
              .
            </p>
          </div>

          {canViewPurchases && (
            <div className="rounded-2xl bg-blue-700 p-6 text-white shadow-md">
              <p className="text-sm font-medium text-white/70">
                Total comprado históricamente
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(
                  totalPurchases,
                  currencySymbol
                )}
              </p>

              <p className="mt-2 text-sm text-white/60">
                {
                  purchases.length
                }{" "}
                compra
                {purchases.length ===
                1
                  ? ""
                  : "s"}{" "}
                completada
                {purchases.length ===
                1
                  ? ""
                  : "s"}
                .
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}