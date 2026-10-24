import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

import {
  CircleAlert,
  Save,
  Tags,
} from "lucide-react";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

/*
 * ==========================================
 * CREAR CATEGORÍA
 * ==========================================
 */

async function createCategory(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede crear categorías.
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

  if (!name) {
    redirect(
      "/categorias?error=name-required"
    );
  }

  /*
   * VALIDAR NOMBRE DUPLICADO
   */

  const existingCategory =
    await prisma.category.findUnique({
      where: {
        name,
      },

      select: {
        id: true,
      },
    });

  if (existingCategory) {
    redirect(
      "/categorias?error=duplicate-name"
    );
  }

  try {
    await prisma.category.create({
      data: {
        name,
      },
    });
  } catch (error) {
    console.error(
      "Error creando categoría:",
      error
    );

    redirect(
      "/categorias?error=server-error"
    );
  }

  revalidatePath(
    "/categorias"
  );

  redirect("/categorias");
}

/*
 * ==========================================
 * ELIMINAR CATEGORÍA
 * ==========================================
 */

async function deleteCategory(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede eliminar categorías.
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
    redirect(
      "/categorias?error=invalid-id"
    );
  }

  /*
   * BUSCAR CATEGORÍA
   */

  const category =
    await prisma.category.findUnique({
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

  if (!category) {
    redirect(
      "/categorias?error=not-found"
    );
  }

  /*
   * NO PERMITIR ELIMINACIÓN
   * SI TIENE PRODUCTOS ASOCIADOS
   */

  if (
    category.products.length >
    0
  ) {
    redirect(
      "/categorias?error=has-products"
    );
  }

  try {
    await prisma.category.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    console.error(
      "Error eliminando categoría:",
      error
    );

    redirect(
      "/categorias?error=server-error"
    );
  }

  revalidatePath(
    "/categorias"
  );

  redirect("/categorias");
}

/*
 * ==========================================
 * PÁGINA CATEGORÍAS
 * ==========================================
 */

export default async function CategoriasPage({
  searchParams,
}: Props) {
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

  const params =
    await searchParams;

  const categories =
    await prisma.category.findMany({
      include: {
        products: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Categorías
          </h1>

          <p className="text-slate-500">
            Administra las categorías de productos del sistema.
          </p>
        </header>

        {/* ERRORES */}
        {params.error ===
          "name-required" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Nombre obligatorio
              </p>

              <p>
                Escribe un nombre para registrar la categoría.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "duplicate-name" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Categoría duplicada
              </p>

              <p>
                Ya existe una categoría registrada con ese nombre.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "has-products" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Categoría en uso
              </p>

              <p>
                No se puede eliminar porque tiene productos asociados.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "not-found" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Categoría no encontrada
              </p>

              <p>
                La categoría seleccionada ya no existe.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "invalid-id" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Categoría no válida
              </p>

              <p>
                No se pudo identificar correctamente la categoría seleccionada.
              </p>
            </div>
          </div>
        )}

        {params.error ===
          "server-error" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                No se pudo completar la operación
              </p>

              <p>
                Ocurrió un error inesperado. Revisa la consola del servidor.
              </p>
            </div>
          </div>
        )}

        {/* NUEVA CATEGORÍA */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Tags size={20} />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Nueva categoría
            </h2>
          </div>

          <form
            action={createCategory}
            className="flex flex-col gap-3 md:flex-row"
          >
            <input
              name="name"
              placeholder="Ej: Repuestos, Farmacia, Ferretería..."
              className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              required
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              <Save size={18} />
              Guardar categoría
            </button>
          </form>
        </section>

        {/* LISTADO */}
        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-left">
                  Categoría
                </th>

                <th className="p-4 text-center">
                  Productos asociados
                </th>

                <th className="p-4 text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {categories.map(
                (category) => {
                  const hasProducts =
                    category.products
                      .length > 0;

                  return (
                    <tr
                      key={
                        category.id
                      }
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Tags
                              size={16}
                            />
                          </div>

                          <span className="font-semibold text-slate-900">
                            {
                              category.name
                            }
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {
                            category.products
                              .length
                          }
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <form
                            action={
                              deleteCategory
                            }
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={
                                category.id
                              }
                            />

                            <ConfirmDeleteButton
                              disabled={
                                hasProducts
                              }
                              title="¿Desea eliminar esta categoría?"
                              text="Esta acción eliminará la categoría del sistema."
                            />
                          </form>

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

              {categories.length ===
                0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="p-8 text-center text-slate-500"
                  >
                    Aún no se han registrado categorías en el sistema.
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