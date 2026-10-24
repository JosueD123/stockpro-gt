import { prisma } from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

import { requireRole } from "@/lib/auth";

import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

import {
  Pencil,
  UserPlus,
  Eye,
} from "lucide-react";

/*
 * ==========================================
 * CREAR CLIENTE
 * ==========================================
 */

async function createCustomer(
  formData: FormData
) {
  "use server";

  /*
   * ADMIN y SELLER pueden crear clientes.
   */

  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const name = String(
    formData.get("name") || ""
  ).trim();

  const phone = String(
    formData.get("phone") || ""
  ).trim();

  const email = String(
    formData.get("email") || ""
  )
    .trim()
    .toLowerCase();

  const address = String(
    formData.get("address") || ""
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (!name) {
    return;
  }

  await prisma.customer.create({
    data: {
      name,
      phone,
      email,
      address,
      notes,
    },
  });

  revalidatePath("/clientes");
}

/*
 * ==========================================
 * ELIMINAR CLIENTE
 * ==========================================
 */

async function deleteCustomer(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede eliminar clientes.
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const id = Number(
    formData.get("id")
  );

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return;
  }

  /*
   * BUSCAR CLIENTE Y SUS CUENTAS POR COBRAR
   */

  const customer =
    await prisma.customer.findUnique({
      where: {
        id,
      },

      include: {
        accountsReceivable: {
          select: {
            id: true,
            balance: true,
            status: true,
          },
        },
      },
    });

  if (!customer) {
    return;
  }

  /*
   * NO PERMITIR ELIMINAR CLIENTES
   * CON CUENTAS POR COBRAR ASOCIADAS.
   */

  if (
    customer.accountsReceivable.length >
    0
  ) {
    return;
  }

  await prisma.customer.delete({
    where: {
      id,
    },
  });

  revalidatePath("/clientes");
}

/*
 * ==========================================
 * PÁGINA DE CLIENTES
 * ==========================================
 */

export default async function ClientesPage() {
  /*
   * ADMIN y SELLER pueden entrar.
   */

  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const customers =
    await prisma.customer.findMany({
      include: {
        accountsReceivable: {
          select: {
            id: true,
            balance: true,
            status: true,
            dueDate: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const canDelete =
    auth.session.role === "ADMIN";

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Clientes
          </h1>

          <p className="text-slate-500">
            Administración de clientes del negocio.
          </p>
        </header>

        {/* NUEVO CLIENTE */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <UserPlus size={20} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Nuevo cliente
            </h2>
          </div>

          <form
            action={createCustomer}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input
              name="name"
              placeholder="Nombre del cliente"
              className="rounded-xl border px-4 py-3"
              required
            />

            <input
              name="phone"
              placeholder="Teléfono"
              className="rounded-xl border px-4 py-3"
            />

            <input
              name="email"
              type="email"
              placeholder="Correo"
              className="rounded-xl border px-4 py-3"
            />

            <input
              name="address"
              placeholder="Dirección"
              className="rounded-xl border px-4 py-3"
            />

            <textarea
              name="notes"
              placeholder="Notas"
              className="rounded-xl border px-4 py-3 md:col-span-2"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
            >
              <UserPlus size={18} />
              Guardar cliente
            </button>
          </form>
        </section>

        {/* LISTADO */}
        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4 text-left">
                    Cliente
                  </th>

                  <th className="p-4 text-left">
                    Teléfono
                  </th>

                  <th className="p-4 text-left">
                    Correo
                  </th>

                  <th className="p-4 text-right">
                    Saldo pendiente
                  </th>

                  <th className="p-4 text-center">
                    Estado
                  </th>

                  <th className="p-4 text-center">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {customers.map(
                  (customer) => {
                    const pendingAccounts =
                      customer.accountsReceivable.filter(
                        (account) =>
                          account.status !==
                          "PAID"
                      );

                    const pendingBalance =
                      pendingAccounts.reduce(
                        (
                          total,
                          account
                        ) =>
                          total +
                          account.balance,
                        0
                      );

                    const overdueAccounts =
                      pendingAccounts.filter(
                        (account) =>
                          account.dueDate <
                          new Date()
                      );

                    const hasDebt =
                      pendingAccounts.length >
                      0;

                    const hasOverdue =
                      overdueAccounts.length >
                      0;

                    const debtStatus =
                      hasOverdue
                        ? {
                            label:
                              "Vencida",
                            className:
                              "bg-red-100 text-red-700",
                          }
                        : hasDebt
                          ? {
                              label:
                                "Pendiente",
                              className:
                                "bg-amber-100 text-amber-700",
                            }
                          : {
                              label:
                                "Al día",
                              className:
                                "bg-green-100 text-green-700",
                            };

                    const hasReceivableHistory =
                      customer
                        .accountsReceivable
                        .length > 0;

                    return (
                      <tr
                        key={
                          customer.id
                        }
                        className="border-b hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <p className="font-semibold">
                            {
                              customer.name
                            }
                          </p>

                          <p className="text-slate-500">
                            {
                              customer.address ||
                              "Dirección no registrada"
                            }
                          </p>
                        </td>

                        <td className="p-4">
                          {
                            customer.phone ||
                            "Teléfono no registrado"
                          }
                        </td>

                        <td className="p-4">
                          {
                            customer.email ||
                            "Correo no registrado"
                          }
                        </td>

                        <td className="p-4 text-right">
                          <p
                            className={`font-bold ${
                              hasDebt
                                ? "text-red-700"
                                : "text-slate-700"
                            }`}
                          >
                            Q
                            {pendingBalance.toLocaleString(
                              "es-GT",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </p>

                          {hasDebt && (
                            <p className="text-xs text-slate-500">
                              {
                                pendingAccounts.length
                              }{" "}
                              cuenta
                              {
                                pendingAccounts.length ===
                                1
                                  ? ""
                                  : "s"
                              } pendiente
                              {
                                pendingAccounts.length ===
                                1
                                  ? ""
                                  : "s"
                              }
                            </p>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${debtStatus.className}`}
                          >
                            {
                              debtStatus.label
                            }
                          </span>

                          {hasOverdue && (
                            <p className="mt-1 text-xs text-red-600">
                              {
                                overdueAccounts.length
                              }{" "}
                              vencida
                              {
                                overdueAccounts.length ===
                                1
                                  ? ""
                                  : "s"
                              }
                            </p>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Link
                              href={`/clientes/${customer.id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-800"
                            >
                              <Eye
                                size={
                                  13
                                }
                              />
                              Ver
                            </Link>

                            <Link
                              href={`/clientes/${customer.id}/editar`}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                            >
                              <Pencil
                                size={
                                  13
                                }
                              />
                              Editar
                            </Link>

                            {canDelete && (
                              <form
                                action={
                                  deleteCustomer
                                }
                              >
                                <input
                                  type="hidden"
                                  name="id"
                                  value={
                                    customer.id
                                  }
                                />

                                <ConfirmDeleteButton
                                  disabled={
                                    hasReceivableHistory
                                  }
                                  title={
                                    hasReceivableHistory
                                      ? "No se puede eliminar este cliente"
                                      : "¿Desea eliminar este cliente?"
                                  }
                                  text={
                                    hasReceivableHistory
                                      ? "Este cliente tiene cuentas por cobrar asociadas y debe conservarse en el historial."
                                      : "Esta acción eliminará el cliente del sistema."
                                  }
                                />
                              </form>
                            )}
                          </div>

                          {hasReceivableHistory && (
                            <p className="mt-2 text-xs text-slate-500">
                              Tiene historial de crédito
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}

                {customers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center text-slate-500"
                    >
                      Aún no se han registrado clientes en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
