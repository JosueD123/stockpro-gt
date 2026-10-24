"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ArrowDownToLine,
  ClipboardPen,
  History,
  Tags,
  Truck,
  Users,
  ShoppingCart,
  BarChart3,
  Wallet,
  Settings,
  Info,
  LogOut,
  ShieldCheck,
  UserRound,
  UserCog,
} from "lucide-react";

type UserRole =
  | "ADMIN"
  | "SELLER"
  | "VIEWER";

type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
};

function normalizeRole(
  role?: string
): UserRole {
  if (role === "SELLER") {
    return "SELLER";
  }

  if (role === "VIEWER") {
    return "VIEWER";
  }

  return "ADMIN";
}

function getRoleLabel(
  role: UserRole
) {
  switch (role) {
    case "ADMIN":
      return "Administrador";

    case "SELLER":
      return "Vendedor";

    case "VIEWER":
      return "Consulta";

    default:
      return role;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [
    businessName,
    setBusinessName,
  ] = useState(
    "ControlStock Pro"
  );

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<AuthenticatedUser | null>(
      null
    );

  const [
    loadingUser,
    setLoadingUser,
  ] = useState(true);

  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [
          businessResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            "/api/configuracion",
            {
              cache: "no-store",
            }
          ),

          fetch("/api/auth/me", {
            cache: "no-store",
          }),
        ]);

        if (
          businessResponse.ok
        ) {
          const businessData =
            await businessResponse.json();

          if (
            typeof businessData.name ===
              "string" &&
            businessData.name.trim()
          ) {
            setBusinessName(
              businessData.name
            );
          }
        }

        if (userResponse.ok) {
          const userData =
            await userResponse.json();

          if (userData.user) {
            setCurrentUser(
              userData.user
            );
          }
        } else if (
          userResponse.status ===
          401
        ) {
          router.replace("/");
          router.refresh();
        }
      } catch (error) {
        console.error(
          "Error cargando el Sidebar:",
          error
        );
      } finally {
        setLoadingUser(false);
      }
    }

    loadSidebarData();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        }
      );
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const currentRole =
    normalizeRole(
      currentUser?.role
    );

  const menu: MenuItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: [
        "ADMIN",
        "SELLER",
        "VIEWER",
      ],
    },
    {
      name: "Productos",
      href: "/productos",
      icon: Package,
      roles: [
        "ADMIN",
        "SELLER",
        "VIEWER",
      ],
    },
    {
      name: "Compras",
      href: "/compras",
      icon: ShoppingBag,
      roles: ["ADMIN"],
    },
    {
      name: "Entradas",
      href: "/entradas",
      icon: ArrowDownToLine,
      roles: ["ADMIN"],
    },
    {
      name: "Ajustes",
      href: "/ajustes",
      icon: ClipboardPen,
      roles: ["ADMIN"],
    },
    {
      name: "Kardex",
      href: "/kardex",
      icon: History,
      roles: [
        "ADMIN",
        "SELLER",
        "VIEWER",
      ],
    },
    {
      name: "Categorías",
      href: "/categorias",
      icon: Tags,
      roles: ["ADMIN"],
    },
    {
      name: "Proveedores",
      href: "/proveedores",
      icon: Truck,
      roles: ["ADMIN"],
    },
    {
      name: "Clientes",
      href: "/clientes",
      icon: Users,
      roles: [
        "ADMIN",
        "SELLER",
      ],
    },
    {
  name: "Ventas",
  href: "/ventas",
  icon: ShoppingCart,
  roles: [
    "ADMIN",
    "SELLER",
  ],
},

{
  name: "Cuentas por cobrar",
  href: "/cuentas-por-cobrar",
  icon: Wallet,
  roles: [
    "ADMIN",
    "SELLER",
  ],
},

{
  name: "Reportes",
      href: "/reportes",
      icon: BarChart3,
      roles: [
        "ADMIN",
        "VIEWER",
      ],
    },
  ];

  const settingsMenu: MenuItem[] =
    [
      {
        name: "Usuarios",
        href: "/usuarios",
        icon: UserCog,
        roles: ["ADMIN"],
      },
      {
        name: "Configuración",
        href: "/configuracion",
        icon: Settings,
        roles: ["ADMIN"],
      },
      {
        name: "Acerca de",
        href: "/acerca-de",
        icon: Info,
        roles: [
          "ADMIN",
          "SELLER",
          "VIEWER",
        ],
      },
    ];

  const visibleMenu =
    useMemo(
      () =>
        menu.filter((item) =>
          item.roles.includes(
            currentRole
          )
        ),
      [currentRole]
    );

  const visibleSettingsMenu =
    useMemo(
      () =>
        settingsMenu.filter(
          (item) =>
            item.roles.includes(
              currentRole
            )
        ),
      [currentRole]
    );

  function renderMenuItem(
    item: MenuItem
  ) {
    const Icon = item.icon;

    const isActive =
      pathname === item.href ||
      pathname.startsWith(
        `${item.href}/`
      );

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
          isActive
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-200 hover:bg-slate-800"
        }`}
      >
        <Icon size={18} />

        <span>{item.name}</span>
      </Link>
    );
  }

  return (
    <aside className="flex min-h-screen w-64 flex-col justify-between bg-slate-900 text-white print:hidden">
      <div>
        {/* IDENTIDAD DEL NEGOCIO */}
        <div className="border-b border-slate-800 p-6">
          <h1 className="truncate text-2xl font-bold">
            {businessName}
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            ControlStock Pro
          </p>
        </div>

        {/* MENÚ PRINCIPAL */}
        <nav className="space-y-2 p-4">
          {visibleMenu.map(
            renderMenuItem
          )}

          {visibleSettingsMenu.length >
            0 && (
            <>
              <div className="my-4 border-t border-slate-800" />

              {visibleSettingsMenu.map(
                renderMenuItem
              )}
            </>
          )}
        </nav>
      </div>

      {/* USUARIO CONECTADO */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl bg-slate-800 p-4">
          {loadingUser ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-32 rounded bg-slate-700" />
              <div className="h-3 w-24 rounded bg-slate-700" />
              <div className="h-3 w-40 rounded bg-slate-700" />
            </div>
          ) : currentUser ? (
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-200">
                  <UserRound
                    size={20}
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {
                      currentUser.name
                    }
                  </p>

                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-green-400">
                    <ShieldCheck
                      size={13}
                    />

                    <span>
                      {getRoleLabel(
                        currentRole
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 truncate text-xs text-slate-400">
                {currentUser.email}
              </p>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold">
                Sesión no disponible
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Vuelve a iniciar
                sesión.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
          >
            <LogOut size={15} />

            <span>
              Cerrar sesión
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}