import {
  AlertTriangle,
  CircleCheck,
  CircleX,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";

type SystemAlertsProps = {
  lowStock: number;
  outOfStock: number;
  salesTodayCount: number;
  totalSalesToday: number;
  recentProductName?: string;
  lastSaleTotal?: number;
  currencySymbol: string;

  /*
   * ==========================================
   * CUENTAS POR COBRAR
   * ==========================================
   */
  receivablesPending?: number;
  receivablesOverdue?: number;
};

export default function SystemAlerts({
  lowStock,
  outOfStock,
  salesTodayCount,
  totalSalesToday,
  recentProductName,
  lastSaleTotal,
  currencySymbol,
  receivablesPending = 0,
  receivablesOverdue = 0,
}: SystemAlertsProps) {
  const inventoryIsHealthy = lowStock === 0 && outOfStock === 0;
  const receivablesAreHealthy = receivablesOverdue === 0;

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Alertas del sistema
        </h2>

        <p className="text-sm text-slate-500">
          Resumen de situaciones que requieren atención y actividad reciente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inventoryIsHealthy ? (
          <div className="flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CircleCheck size={21} />
            </div>

            <div>
              <h3 className="font-bold text-green-900">
                Inventario saludable
              </h3>

              <p className="mt-1 text-sm text-green-700">
                No existen productos agotados ni con stock bajo.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={21} />
              </div>

              <div>
                <h3 className="font-bold text-amber-900">
                  Productos con stock bajo
                </h3>

                <p className="mt-1 text-sm text-amber-700">
                  {lowStock === 0
                    ? "No hay productos con stock bajo."
                    : `${lowStock} producto${
                        lowStock === 1 ? "" : "s"
                      } necesita${
                        lowStock === 1 ? "" : "n"
                      } reposición.`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <CircleX size={21} />
              </div>

              <div>
                <h3 className="font-bold text-red-900">
                  Productos agotados
                </h3>

                <p className="mt-1 text-sm text-red-700">
                  {outOfStock === 0
                    ? "No hay productos agotados."
                    : `${outOfStock} producto${
                        outOfStock === 1 ? "" : "s"
                      } no tiene${
                        outOfStock === 1 ? "" : "n"
                      } existencia.`}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShoppingCart size={21} />
          </div>

          <div>
            <h3 className="font-bold text-blue-900">
              Ventas de hoy
            </h3>

            <p className="mt-1 text-sm text-blue-700">
              {salesTodayCount === 0
                ? "Todavía no se han registrado ventas hoy."
                : `${salesTodayCount} venta${
                    salesTodayCount === 1 ? "" : "s"
                  } por un total de ${currencySymbol}${totalSalesToday.toFixed(
                    2
                  )}.`}
            </p>
          </div>
        </div>

        <div
          className={`flex items-start gap-4 rounded-2xl border p-5 ${
            receivablesAreHealthy
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              receivablesAreHealthy
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {receivablesAreHealthy ? (
              <CircleCheck size={21} />
            ) : (
              <AlertTriangle size={21} />
            )}
          </div>

          <div>
            <h3
              className={`font-bold ${
                receivablesAreHealthy
                  ? "text-green-900"
                  : "text-red-900"
              }`}
            >
              {receivablesAreHealthy
                ? "Cuentas por cobrar al día"
                : "Cuentas por cobrar vencidas"}
            </h3>

            <p
              className={`mt-1 text-sm ${
                receivablesAreHealthy
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {receivablesAreHealthy
                ? receivablesPending === 0
                  ? "No existen cuentas pendientes de cobro."
                  : `Hay ${receivablesPending} cuenta${
                      receivablesPending === 1 ? "" : "s"
                    } pendiente${
                      receivablesPending === 1 ? "" : "s"
                    }, sin vencimientos.`
                : `Hay ${receivablesOverdue} cuenta${
                    receivablesOverdue === 1 ? "" : "s"
                  } vencida${
                    receivablesOverdue === 1 ? "" : "s"
                  } que requiere${
                    receivablesOverdue === 1 ? "" : "n"
                  } atención.`}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Package size={21} />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              Último producto agregado
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {recentProductName ||
                "Aún no se han registrado productos."}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <Wallet size={21} />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              Última venta registrada
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {lastSaleTotal === undefined
                ? "Aún no se han registrado ventas."
                : `${currencySymbol}${lastSaleTotal.toFixed(
                    2
                  )}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
