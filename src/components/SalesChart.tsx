"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CalendarDays,
  TrendingUp,
} from "lucide-react";

type ChartItem = {
  date: string;
  sales: number;
  purchases: number;
};

type Props = {
  data: ChartItem[];
  currencySymbol?: string;
  showPurchases?: boolean;
};

type Period =
  | "7days"
  | "30days"
  | "month"
  | "year";

type TooltipPayloadItem = {
  name?: string;
  value?: number;
  dataKey?: string;
  color?: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  currencySymbol: string;
};

type ProcessedChartItem = {
  date: string;
  sales: number;
  purchases: number;
};

const PERIODS: {
  value: Period;
  label: string;
}[] = [
  {
    value: "7days",
    label: "7 días",
  },

  {
    value: "30days",
    label: "30 días",
  },

  {
    value: "month",
    label: "Este mes",
  },

  {
    value: "year",
    label: "Este año",
  },
];

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

function parseLocalDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDayLabel(
  value: string
) {
  return parseLocalDate(
    value
  )
    .toLocaleDateString(
      "es-GT",
      {
        day: "2-digit",
        month: "short",
      }
    )
    .replace(".", "");
}

function CustomTooltip({
  active,
  payload,
  label,
  currencySymbol,
}: CustomTooltipProps) {
  if (
    !active ||
    !payload ||
    payload.length === 0
  ) {
    return null;
  }

  return (
    <div className="min-w-48 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="mb-3 text-sm font-bold text-slate-900">
        {label}
      </p>

      <div className="space-y-2">
        {payload.map(
          (item) => {
            const isSales =
              item.dataKey ===
              "sales";

            return (
              <div
                key={
                  item.dataKey
                }
                className="flex items-center justify-between gap-6 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isSales
                        ? "bg-green-600"
                        : "bg-blue-600"
                    }`}
                  />

                  <span className="text-slate-600">
                    {isSales
                      ? "Ventas"
                      : "Compras"}
                  </span>
                </div>

                <span className="font-bold text-slate-900">
                  {formatMoney(
                    Number(
                      item.value ||
                        0
                    ),
                    currencySymbol
                  )}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

export default function SalesChart({
  data,
  currencySymbol = "Q",
  showPurchases = true,
}: Props) {
  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      "7days"
    );

  const today =
    useMemo(() => {
      const now =
        new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
    }, []);

  /*
   * ==========================================
   * PROCESAR DATOS
   * ==========================================
   */

  const processedData =
    useMemo<
      ProcessedChartItem[]
    >(() => {
      /*
       * AÑO ACTUAL
       */

      if (
        period === "year"
      ) {
        const currentYear =
          today.getFullYear();

        return Array.from(
          {
            length: 12,
          },
          (
            _,
            monthIndex
          ) => {
            const monthData =
              data.filter(
                (item) => {
                  const itemDate =
                    parseLocalDate(
                      item.date
                    );

                  return (
                    itemDate.getFullYear() ===
                      currentYear &&
                    itemDate.getMonth() ===
                      monthIndex
                  );
                }
              );

            return {
              date: new Date(
                currentYear,
                monthIndex,
                1
              )
                .toLocaleDateString(
                  "es-GT",
                  {
                    month:
                      "short",
                  }
                )
                .replace(
                  ".",
                  ""
                ),

              sales:
                monthData.reduce(
                  (
                    accumulator,
                    item
                  ) =>
                    accumulator +
                    item.sales,
                  0
                ),

              purchases:
                showPurchases
                  ? monthData.reduce(
                      (
                        accumulator,
                        item
                      ) =>
                        accumulator +
                        item.purchases,
                      0
                    )
                  : 0,
            };
          }
        );
      }

      /*
       * PERÍODOS DIARIOS
       */

      let startDate =
        new Date(today);

      if (
        period === "7days"
      ) {
        startDate.setDate(
          startDate.getDate() -
            6
        );
      }

      if (
        period === "30days"
      ) {
        startDate.setDate(
          startDate.getDate() -
            29
        );
      }

      if (
        period === "month"
      ) {
        startDate =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
      }

      return data
        .filter((item) => {
          const itemDate =
            parseLocalDate(
              item.date
            );

          return (
            itemDate >=
              startDate &&
            itemDate <= today
          );
        })
        .map((item) => ({
          date:
            formatDayLabel(
              item.date
            ),

          sales:
            item.sales,

          purchases:
            showPurchases
              ? item.purchases
              : 0,
        }));
    }, [
      data,
      period,
      today,
      showPurchases,
    ]);

  /*
   * ==========================================
   * TOTALES
   * ==========================================
   */

  const totalSales =
    processedData.reduce(
      (
        accumulator,
        item
      ) =>
        accumulator +
        item.sales,
      0
    );

  const totalPurchases =
    showPurchases
      ? processedData.reduce(
          (
            accumulator,
            item
          ) =>
            accumulator +
            item.purchases,
          0
        )
      : 0;

  const balance =
    totalSales -
    totalPurchases;

  /*
   * ==========================================
   * TÍTULOS
   * ==========================================
   */

  const subject =
    showPurchases
      ? "Ventas y compras"
      : "Ventas";

  const title =
    period === "7days"
      ? `${subject} de los últimos 7 días`
      : period ===
          "30days"
        ? `${subject} de los últimos 30 días`
        : period ===
            "month"
          ? `${subject} del mes actual`
          : `${subject} del año actual`;

  const description =
    period === "year"
      ? showPurchases
        ? "Comparación mensual de ventas y compras completadas durante el año."
        : "Comportamiento mensual de las ventas registradas durante el año."
      : showPurchases
        ? "Comparación diaria de ventas y compras completadas durante el período seleccionado."
        : "Comportamiento diario de las ventas registradas durante el período seleccionado.";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
      <div className="mb-5 flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700">
              <TrendingUp
                size={17}
              />

              Resumen comercial
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {
                description
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1.5">
            {PERIODS.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() =>
                    setPeriod(
                      option.value
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    period ===
                    option.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  {
                    option.label
                  }
                </button>
              )
            )}
          </div>
        </div>

        {/* RESUMEN */}

        <div
          className={`grid grid-cols-1 gap-2 ${
            showPurchases
              ? "sm:grid-cols-3"
              : ""
          }`}
        >
          <div className="rounded-xl bg-green-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Ventas
            </p>

            <p className="mt-1 font-bold text-green-900">
              {formatMoney(
                totalSales,
                currencySymbol
              )}
            </p>
          </div>

          {showPurchases && (
            <>
              <div className="rounded-xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Compras
                </p>

                <p className="mt-1 font-bold text-blue-900">
                  {formatMoney(
                    totalPurchases,
                    currencySymbol
                  )}
                </p>
              </div>

              <div
                className={`rounded-xl px-4 py-3 ${
                  balance >= 0
                    ? "bg-violet-50"
                    : "bg-red-50"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    balance >= 0
                      ? "text-violet-700"
                      : "text-red-700"
                  }`}
                >
                  Balance
                </p>

                <p
                  className={`mt-1 font-bold ${
                    balance >= 0
                      ? "text-violet-900"
                      : "text-red-900"
                  }`}
                >
                  {formatMoney(
                    balance,
                    currencySymbol
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* GRÁFICA */}

      {processedData.length >
      0 ? (
        <div className="h-[340px] min-h-[340px] min-w-0 w-full">
          <ResponsiveContainer
            width="100%"
            height={340}
            minWidth={0}
          >
            <LineChart
              data={
                processedData
              }
              margin={{
                top: 10,
                right: 15,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#e2e8f0"
                vertical={
                  false
                }
              />

              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 12,
                  fill:
                    "#64748b",
                }}
                axisLine={{
                  stroke:
                    "#cbd5e1",
                }}
                tickLine={
                  false
                }
                interval={
                  period ===
                  "30days"
                    ? 4
                    : period ===
                        "month"
                      ? 2
                      : 0
                }
              />

              <YAxis
                tick={{
                  fontSize: 12,
                  fill:
                    "#64748b",
                }}
                axisLine={
                  false
                }
                tickLine={
                  false
                }
                tickFormatter={(
                  value
                ) =>
                  `${currencySymbol}${Number(
                    value
                  ).toLocaleString(
                    "es-GT"
                  )}`
                }
                width={75}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    currencySymbol={
                      currencySymbol
                    }
                  />
                }
              />

              <Legend
                verticalAlign="top"
                align="right"
                height={40}
                formatter={(
                  value
                ) =>
                  value ===
                  "sales"
                    ? "Ventas"
                    : "Compras"
                }
              />

              <Line
                type="monotone"
                dataKey="sales"
                name="sales"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{
                  r: 3,
                  strokeWidth: 2,
                  fill:
                    "#ffffff",
                }}
                activeDot={{
                  r: 6,
                }}
              />

              {showPurchases && (
                <Line
                  type="monotone"
                  dataKey="purchases"
                  name="purchases"
                  stroke="#2563eb"
                  strokeWidth={
                    3
                  }
                  dot={{
                    r: 3,
                    strokeWidth: 2,
                    fill:
                      "#ffffff",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <div className="text-center">
            <CalendarDays
              size={42}
              className="mx-auto mb-3 text-slate-300"
            />

            <p className="font-semibold text-slate-700">
              No existen datos disponibles
            </p>

            <p className="mt-1 text-sm text-slate-500">
              No hay operaciones registradas durante el período seleccionado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}