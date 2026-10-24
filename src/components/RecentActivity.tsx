import {
  PackagePlus,
  ShoppingCart,
  Truck,
  UserPlus,
  WalletCards,
} from "lucide-react";

type ActivityItem = {
  title: string;
  description: string;
  date: Date | string;
  icon: typeof ShoppingCart;
  iconClass: string;
};

type RecentActivityProps = {
  lastSale?: {
    total: number;
    createdAt: Date | string;
    customerName?: string | null;
  };

  lastProduct?: {
    name: string;
    createdAt: Date | string;
  };

  lastCustomer?: {
    name: string;
    createdAt: Date | string;
  };

  lastSupplier?: {
    name: string;
    createdAt: Date | string;
  };

  lastReceivablePayment?: {
    amount: number;
    paymentDate: Date | string;
    customerName?: string | null;
  };

  currencySymbol: string;

  showSupplier?: boolean;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("es-GT", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function RecentActivity({
  lastSale,
  lastProduct,
  lastCustomer,
  lastSupplier,
  lastReceivablePayment,
  currencySymbol,
  showSupplier = true,
}: RecentActivityProps) {
  const activities: ActivityItem[] = [];

  /*
   * ==========================================
   * VENTA
   * ==========================================
   */

  if (lastSale) {
    activities.push({
      title: "Venta registrada",

      description: `${
        lastSale.customerName || "Consumidor final"
      } · ${currencySymbol}${lastSale.total.toFixed(2)}`,

      date: lastSale.createdAt,

      icon: ShoppingCart,

      iconClass: "bg-green-100 text-green-700",
    });
  }

  /*
   * ==========================================
   * ABONO
   * ==========================================
   */

  if (lastReceivablePayment) {
    activities.push({
      title: "Abono registrado",

      description: `${
        lastReceivablePayment.customerName ||
        "Cliente"
      } · ${currencySymbol}${lastReceivablePayment.amount.toFixed(
        2
      )}`,

      date: lastReceivablePayment.paymentDate,

      icon: WalletCards,

      iconClass: "bg-emerald-100 text-emerald-700",
    });
  }

  /*
   * ==========================================
   * PRODUCTO
   * ==========================================
   */

  if (lastProduct) {
    activities.push({
      title: "Producto agregado",

      description: lastProduct.name,

      date: lastProduct.createdAt,

      icon: PackagePlus,

      iconClass: "bg-blue-100 text-blue-700",
    });
  }

  /*
   * ==========================================
   * CLIENTE
   * ==========================================
   */

  if (lastCustomer) {
    activities.push({
      title: "Cliente registrado",

      description: lastCustomer.name,

      date: lastCustomer.createdAt,

      icon: UserPlus,

      iconClass: "bg-violet-100 text-violet-700",
    });
  }

  /*
   * ==========================================
   * PROVEEDOR
   * ==========================================
   *
   * SELLER no debe visualizar
   * información de proveedores.
   */

  if (showSupplier && lastSupplier) {
    activities.push({
      title: "Proveedor registrado",

      description: lastSupplier.name,

      date: lastSupplier.createdAt,

      icon: Truck,

      iconClass: "bg-amber-100 text-amber-700",
    });
  }

  /*
   * ==========================================
   * ORDENAR ACTIVIDAD
   * ==========================================
   */

  const sortedActivities = activities
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, 4);

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Actividad reciente
        </h2>

        <p className="text-sm text-slate-500">
          Últimos movimientos registrados en el sistema.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {sortedActivities.length > 0 ? (
          <div className="space-y-1">
            {sortedActivities.map(
              (activity, index) => {
                const Icon = activity.icon;

                const isLast =
                  index ===
                  sortedActivities.length - 1;

                return (
                  <div
                    key={`${activity.title}-${new Date(
                      activity.date
                    ).getTime()}`}
                    className="relative flex gap-4"
                  >
                    {!isLast && (
                      <div className="absolute left-[21px] top-11 h-full w-px bg-slate-200" />
                    )}

                    <div
                      className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${activity.iconClass}`}
                    >
                      <Icon size={20} />
                    </div>

                    <div
                      className={`flex-1 pb-6 ${
                        !isLast
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                        <h3 className="font-semibold text-slate-900">
                          {activity.title}
                        </h3>

                        <span className="text-xs text-slate-400">
                          {formatDate(activity.date)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <ShoppingCart
              className="mx-auto mb-3 text-slate-300"
              size={36}
            />

            <p className="font-semibold text-slate-700">
              Sin actividad reciente
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Las nuevas operaciones aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
