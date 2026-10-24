import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { redirect } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * ==========================================
 * ACTUALIZAR PROVEEDOR
 * ==========================================
 */

async function updateSupplier(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede editar proveedores.
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

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect(
      "/proveedores"
    );
  }

  if (!name) {
    redirect(
      "/proveedores"
    );
  }

  const supplier =
    await prisma.supplier.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!supplier) {
    redirect(
      "/proveedores"
    );
  }

  await prisma.supplier.update({
    where: {
      id,
    },

    data: {
      name,
      phone,
      email,
      address,
    },
  });

  redirect(
    "/proveedores"
  );
}

/*
 * ==========================================
 * PÁGINA EDITAR PROVEEDOR
 * ==========================================
 */

export default async function EditarProveedorPage({
  params,
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

  const { id } =
    await params;

  const supplierId =
    Number(id);

  if (
    !Number.isInteger(
      supplierId
    ) ||
    supplierId <= 0
  ) {
    redirect(
      "/proveedores"
    );
  }

  const supplier =
    await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

  if (!supplier) {
    redirect(
      "/proveedores"
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Editar proveedor
            </h1>

            <p className="text-slate-500">
              Actualiza la información del proveedor seleccionado.
            </p>
          </div>

          <Link
            href="/proveedores"
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            ← Volver
          </Link>
        </div>

        <form
          action={
            updateSupplier
          }
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <input
            type="hidden"
            name="id"
            defaultValue={
              supplier.id
            }
          />

          <input
            name="name"
            defaultValue={
              supplier.name
            }
            placeholder="Nombre del proveedor"
            className="rounded-xl border px-4 py-3"
            required
          />

          <input
            name="phone"
            defaultValue={
              supplier.phone ||
              ""
            }
            placeholder="Teléfono"
            className="rounded-xl border px-4 py-3"
          />

          <input
            name="email"
            type="email"
            defaultValue={
              supplier.email ||
              ""
            }
            placeholder="Correo electrónico"
            className="rounded-xl border px-4 py-3"
          />

          <input
            name="address"
            defaultValue={
              supplier.address ||
              ""
            }
            placeholder="Dirección"
            className="rounded-xl border px-4 py-3"
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
          >
            Guardar cambios
          </button>
        </form>
      </div>
    </main>
  );
}