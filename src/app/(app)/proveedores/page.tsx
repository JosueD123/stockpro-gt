import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

import {
  Truck,
  Save,
  Pencil,
} from "lucide-react";

/*
 * ==========================================
 * CREAR PROVEEDOR
 * ==========================================
 */

async function createSupplier(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede crear proveedores.
   */

  const auth =
    await requireRole([
      "ADMIN",
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

  if (!name) {
    return;
  }

  await prisma.supplier.create({
    data: {
      name,
      phone,
      email,
      address,
    },
  });

  revalidatePath(
    "/proveedores"
  );
}

/*
 * ==========================================
 * ELIMINAR PROVEEDOR
 * ==========================================
 */

async function deleteSupplier(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede eliminar proveedores.
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
   * BUSCAR PROVEEDOR Y PRODUCTOS ASOCIADOS
   */

  const supplier =
    await prisma.supplier.findUnique({
      where: {
        id,
      },

      include: {
        products: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!supplier) {
    return;
  }

  /*
   * NO PERMITIR ELIMINAR SI TIENE PRODUCTOS
   */

  if (
    supplier.products.length >
    0
  ) {
    return;
  }

  await prisma.supplier.delete({
    where: {
      id,
    },
  });

  revalidatePath(
    "/proveedores"
  );
}

/*
 * ==========================================
 * PÁGINA PROVEEDORES
 * ==========================================
 */

export default async function ProveedoresPage() {
  /*
   * Solo ADMIN puede entrar.
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const suppliers =
    await prisma.supplier.findMany({
      include: {
        products: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Proveedores
          </h1>

          <p className="text-slate-500">
            Administra los proveedores asociados al inventario.
          </p>
        </header>

        {/* NUEVO PROVEEDOR */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Truck size={20} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Nuevo proveedor
            </h2>
          </div>

          <form
            action={createSupplier}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input
              name="name"
              placeholder="Nombre del proveedor"
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
              placeholder="Correo electrónico"
              className="rounded-xl border px-4 py-3"
            />

            <input
              name="address"
              placeholder="Dirección"
              className="rounded-xl border px-4 py-3"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
            >
              <Save size={18} />
              Guardar proveedor
            </button>
          </form>
        </section>

        {/* LISTADO */}
        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-left">
                  Proveedor
                </th>

                <th className="p-4 text-left">
                  Teléfono
                </th>

                <th className="p-4 text-left">
                  Correo
                </th>

                <th className="p-4 text-center">
                  Productos
                </th>

                <th className="p-4 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {suppliers.map(
                (supplier) => {
                  const hasProducts =
                    supplier.products
                      .length > 0;

                  return (
                    <tr
                      key={supplier.id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">
                          {
                            supplier.name
                          }
                        </p>

                        <p className="text-slate-500">
                          {supplier.address ||
                            "Dirección no registrada"}
                        </p>
                      </td>

                      <td className="p-4">
                        {supplier.phone ||
                          "Teléfono no registrado"}
                      </td>

                      <td className="p-4">
                        {supplier.email ||
                          "Correo no registrado"}
                      </td>

                      <td className="p-4 text-center">
                        {
                          supplier.products
                            .length
                        }
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex justify-center gap-2">
                            <Link
                              href={`/proveedores/${supplier.id}/editar`}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                            >
                              <Pencil
                                size={
                                  13
                                }
                              />

                              Editar
                            </Link>

                            <form
                              action={
                                deleteSupplier
                              }
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  supplier.id
                                }
                              />

                              <ConfirmDeleteButton
                                disabled={
                                  hasProducts
                                }
                                title="¿Desea eliminar este proveedor?"
                                text="Esta acción eliminará el proveedor del sistema."
                              />
                            </form>
                          </div>

                          {hasProducts && (
                            <p className="text-xs text-slate-500">
                              Tiene productos asociados
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}

              {suppliers.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-slate-500"
                  >
                    Aún no se han registrado proveedores en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}