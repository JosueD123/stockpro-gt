import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import DeleteUserButton from "@/components/DeleteUserButton";

import {
  ShieldCheck,
  UserPlus,
  Users,
  UserCog,
  Mail,
  CalendarDays,
  Pencil,
} from "lucide-react";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(
    "es-GT",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function getRoleLabel(
  role: string
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

function getRoleClass(
  role: string
) {
  switch (role) {
    case "ADMIN":
      return "bg-violet-100 text-violet-700";

    case "SELLER":
      return "bg-green-100 text-green-700";

    case "VIEWER":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function UsuariosPage() {
    /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Solamente ADMIN puede administrar usuarios.
   */

  const auth = await requireRole([
    "ADMIN",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const currentUserId =
    auth.session.userId;

  /*
   * LISTAR USUARIOS
   */

  const users =
    await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  const admins = users.filter(
    (user) =>
      user.role === "ADMIN"
  ).length;

  const sellers = users.filter(
    (user) =>
      user.role === "SELLER"
  ).length;

  const viewers = users.filter(
    (user) =>
      user.role === "VIEWER"
  ).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">
              <ShieldCheck
                size={17}
              />

              <span>
                Administración del sistema
              </span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Usuarios
            </h1>

            <p className="mt-1 text-slate-500">
              Administra las cuentas de acceso y los roles del sistema.
            </p>
          </div>

          <Link
            href="/usuarios/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            <UserPlus
              size={18}
            />

            Nuevo usuario
          </Link>
        </header>

        {/* MÉTRICAS */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* TOTAL */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Usuarios registrados
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-slate-900">
              {users.length}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Cuentas creadas en el sistema.
            </p>
          </div>

          {/* ADMIN */}
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-violet-700">
                Administradores
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <ShieldCheck
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-violet-900">
              {admins}
            </p>

            <p className="mt-2 text-xs text-violet-700">
              Acceso completo al sistema.
            </p>
          </div>

          {/* SELLER */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-green-700">
                Vendedores
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <UserCog
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-green-900">
              {sellers}
            </p>

            <p className="mt-2 text-xs text-green-700">
              Usuarios orientados a ventas y clientes.
            </p>
          </div>

          {/* VIEWER */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-blue-700">
                Consulta
              </p>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Users
                  size={20}
                />
              </div>
            </div>

            <p className="text-3xl font-bold text-blue-900">
              {viewers}
            </p>

            <p className="mt-2 text-xs text-blue-700">
              Usuarios con acceso de lectura.
            </p>
          </div>
        </section>

        {/* TABLA */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Cuentas de usuario
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Usuarios que pueden iniciar sesión en ControlStock Pro.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {users.length} usuario
              {users.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4 text-left">
                    Usuario
                  </th>

                  <th className="p-4 text-left">
                    Correo
                  </th>

                  <th className="p-4 text-center">
                    Rol
                  </th>

                  <th className="p-4 text-left">
                    Creado
                  </th>

                  <th className="p-4 text-left">
                    Actualizado
                  </th>

                  <th className="p-4 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map(
                  (user) => {
                    const isCurrentUser =
                      user.id ===
                      currentUserId;

                    return (
                      <tr
                        key={
                          user.id
                        }
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                              <Users
                                size={
                                  18
                                }
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900">
                                  {
                                    user.name
                                  }
                                </p>

                                {isCurrentUser && (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                                    Tú
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500">
                                ID #
                                {
                                  user.id
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail
                              size={
                                15
                              }
                            />

                            <span>
                              {
                                user.email
                              }
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleClass(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>
                        </td>

                        <td className="p-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={
                                15
                              }
                            />

                            <span>
                              {formatDate(
                                user.createdAt
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-slate-600">
                          {formatDate(
                            user.updatedAt
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/usuarios/${user.id}/editar`}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600"
                            >
                              <Pencil
                                size={
                                  13
                                }
                              />

                              Editar
                            </Link>

                            <DeleteUserButton
                              userId={
                                user.id
                              }
                              userName={
                                user.name
                              }
                              disabled={
                                isCurrentUser
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}

                {users.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-slate-500"
                    >
                      No existen usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* INFORMACIÓN */}
        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <div>
              <p className="font-bold text-blue-900">
                Administración segura de usuarios
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Los administradores pueden gestionar las cuentas del
                sistema. Por seguridad, la cuenta que tiene la sesión
                iniciada no puede eliminarse a sí misma y el sistema
                tampoco permite eliminar al último administrador.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}