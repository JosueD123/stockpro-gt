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
 * ACTUALIZAR CLIENTE
 * ==========================================
 */

async function updateCustomer(
  formData: FormData
) {
  "use server";

  /*
   * ADMIN y SELLER pueden editar.
   */

  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
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

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect("/clientes");
  }

  if (!name) {
    redirect("/clientes");
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
      },
    });

  if (!customer) {
    redirect("/clientes");
  }

  await prisma.customer.update({
    where: {
      id,
    },

    data: {
      name,
      phone,
      email,
      address,
      notes,
    },
  });

  redirect("/clientes");
}

/*
 * ==========================================
 * PÁGINA EDITAR CLIENTE
 * ==========================================
 */

export default async function EditarClientePage({
  params,
}: Props) {
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

  const { id } =
    await params;

  const customerId =
    Number(id);

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    redirect("/clientes");
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

  if (!customer) {
    redirect("/clientes");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Editar cliente
            </h1>

            <p className="text-slate-500">
              Actualiza la información del cliente seleccionado.
            </p>
          </div>

          <Link
            href="/clientes"
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            ← Volver
          </Link>
        </div>

        <form
          action={updateCustomer}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <input
            type="hidden"
            name="id"
            defaultValue={
              customer.id
            }
          />

          <input
            name="name"
            defaultValue={
              customer.name
            }
            placeholder="Nombre del cliente"
            className="rounded-xl border px-4 py-3"
            required
          />

          <input
            name="phone"
            defaultValue={
              customer.phone || ""
            }
            placeholder="Teléfono"
            className="rounded-xl border px-4 py-3"
          />

          <input
            name="email"
            type="email"
            defaultValue={
              customer.email || ""
            }
            placeholder="Correo electrónico"
            className="rounded-xl border px-4 py-3"
          />

          <input
            name="address"
            defaultValue={
              customer.address || ""
            }
            placeholder="Dirección"
            className="rounded-xl border px-4 py-3"
          />

          <textarea
            name="notes"
            defaultValue={
              customer.notes || ""
            }
            placeholder="Notas"
            className="rounded-xl border px-4 py-3 md:col-span-2"
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