"use client";

import Link from "next/link";

import {
  BarChart3,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  Truck,
  UserPlus,
} from "lucide-react";

type UserRole =
  | "ADMIN"
  | "SELLER"
  | "VIEWER";

type Props = {
  role: UserRole;
};

const actions = [
  {
    title: "Nuevo producto",
    description:
      "Agrega un artículo al inventario.",
    href: "/productos/nuevo",
    icon: PackagePlus,
    iconClass:
      "bg-blue-100 text-blue-700",
    roles: ["ADMIN"],
  },

  {
    title: "Nueva venta",
    description:
      "Registra una venta y actualiza el stock.",
    href: "/ventas/nueva",
    icon: ShoppingCart,
    iconClass:
      "bg-green-100 text-green-700",
    roles: ["ADMIN", "SELLER"],
  },

  {
    title: "Nueva compra",
    description:
      "Registra una compra y aumenta el inventario.",
    href: "/compras",
    icon: ShoppingBag,
    iconClass:
      "bg-indigo-100 text-indigo-700",
    roles: ["ADMIN"],
  },

  {
    title: "Nuevo cliente",
    description:
      "Registra un cliente desde el módulo de clientes.",
    href: "/clientes",
    icon: UserPlus,
    iconClass:
      "bg-violet-100 text-violet-700",
    roles: ["ADMIN", "SELLER"],
  },

  {
    title: "Nuevo proveedor",
    description:
      "Agrega un proveedor para tus productos.",
    href: "/proveedores",
    icon: Truck,
    iconClass:
      "bg-amber-100 text-amber-700",
    roles: ["ADMIN"],
  },

  {
    title: "Ver reportes",
    description:
      "Consulta indicadores y datos del negocio.",
    href: "/reportes",
    icon: BarChart3,
    iconClass:
      "bg-cyan-100 text-cyan-700",
    roles: ["ADMIN", "VIEWER"],
  },
];

export default function QuickActions({
  role,
}: Props) {
  const visibleActions =
    actions.filter((action) =>
      action.roles.includes(role)
    );

  if (
    visibleActions.length === 0
  ) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Acciones rápidas
        </h2>

        <p className="text-sm text-slate-500">
          Accede rápidamente a las tareas disponibles para tu usuario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleActions.map(
          (action) => {
            const Icon =
              action.icon;

            return (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${action.iconClass}`}
                  >
                    <Icon
                      size={22}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      {
                        action.title
                      }
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {
                        action.description
                      }
                    </p>
                  </div>
                </div>
              </Link>
            );
          }
        )}
      </div>
    </section>
  );
}