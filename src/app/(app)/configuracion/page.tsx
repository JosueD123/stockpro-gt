import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const ALLOWED_CURRENCIES = [
  "GTQ",
  "USD",
  "EUR",
];

/*
 * ==========================================
 * GUARDAR CONFIGURACIÓN
 * ==========================================
 */

async function saveConfig(
  formData: FormData
) {
  "use server";

  /*
   * Solo ADMIN puede modificar
   * la configuración del negocio.
   */

  const auth = await requireRole([
    "ADMIN",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const name = String(
    formData.get("name") || ""
  ).trim();

  const address = String(
    formData.get("address") || ""
  ).trim();

  const phone = String(
    formData.get("phone") || ""
  ).trim();

  const email = String(
    formData.get("email") || ""
  )
    .trim()
    .toLowerCase();

  const nit = String(
    formData.get("nit") || ""
  ).trim();

  const currency = String(
    formData.get("currency") || "GTQ"
  ).trim();

  /*
   * VALIDAR NOMBRE
   */

  if (!name) {
    redirect(
      "/configuracion?error=name-required"
    );
  }

  /*
   * VALIDAR MONEDA
   */

  if (
    !ALLOWED_CURRENCIES.includes(
      currency
    )
  ) {
    redirect(
      "/configuracion?error=invalid-currency"
    );
  }

  /*
   * BUSCAR CONFIGURACIÓN EXISTENTE
   */

  const config =
    await prisma.businessConfig.findFirst();

  /*
   * ACTUALIZAR O CREAR
   */

  if (config) {
    await prisma.businessConfig.update({
      where: {
        id: config.id,
      },

      data: {
        name,
        address,
        phone,
        email,
        nit,
        currency,
      },
    });
  } else {
    await prisma.businessConfig.create({
      data: {
        name,
        address,
        phone,
        email,
        nit,
        currency,
      },
    });
  }

  /*
   * REVALIDAR PÁGINAS QUE USAN
   * DATOS DEL NEGOCIO
   */

  revalidatePath(
    "/configuracion"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/productos"
  );

  revalidatePath(
    "/ventas"
  );

  revalidatePath(
    "/reportes"
  );

  redirect(
    "/configuracion"
  );
}

/*
 * ==========================================
 * PÁGINA CONFIGURACIÓN
 * ==========================================
 */

export default async function ConfiguracionPage({
  searchParams,
}: Props) {
  /*
   * Solo ADMIN puede entrar.
   */

  const auth = await requireRole([
    "ADMIN",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params =
    await searchParams;

  const config =
    await prisma.businessConfig.findFirst();

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Configuración del negocio
          </h1>

          <p className="text-slate-500">
            Personaliza la información general que utilizará ControlStock Pro.
          </p>
        </header>

        {/* ERROR: NOMBRE */}
        {params.error ===
          "name-required" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El nombre del negocio es obligatorio.
          </div>
        )}

        {/* ERROR: MONEDA */}
        {params.error ===
          "invalid-currency" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            La moneda seleccionada no es válida.
          </div>
        )}

        <section className="rounded-2xl bg-white p-8 shadow">
          <form
            action={saveConfig}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Nombre del negocio
              </label>

              <input
                name="name"
                defaultValue={
                  config?.name ??
                  "ControlStock Pro"
                }
                className="w-full rounded-xl border px-4 py-3"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Dirección
              </label>

              <input
                name="address"
                defaultValue={
                  config?.address ??
                  ""
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Teléfono
              </label>

              <input
                name="phone"
                defaultValue={
                  config?.phone ??
                  ""
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Correo
              </label>

              <input
                type="email"
                name="email"
                defaultValue={
                  config?.email ??
                  ""
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                NIT
              </label>

              <input
                name="nit"
                defaultValue={
                  config?.nit ??
                  ""
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Moneda
              </label>

              <select
                name="currency"
                defaultValue={
                  config?.currency ??
                  "GTQ"
                }
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="GTQ">
                  Quetzales (GTQ)
                </option>

                <option value="USD">
                  Dólares (USD)
                </option>

                <option value="EUR">
                  Euros (EUR)
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
            >
              Guardar configuración
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}