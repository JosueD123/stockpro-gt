import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

/*
 * ==========================================
 * CREAR PRODUCTO
 * ==========================================
 */

async function createProduct(
  formData: FormData
) {
  "use server";

  /*
   * SEGURIDAD
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  /*
   * DATOS DEL PRODUCTO
   */

  const code = String(
    formData.get("code") || ""
  ).trim();

  const name = String(
    formData.get("name") || ""
  ).trim();

  const brand = String(
    formData.get("brand") || ""
  ).trim();

  const description = String(
    formData.get("description") || ""
  ).trim();

  const priceCost = Number(
    formData.get("priceCost") || 0
  );

  const priceSale = Number(
    formData.get("priceSale") || 0
  );

  const stock = Number(
    formData.get("stock") || 0
  );

  const minStock = Number(
    formData.get("minStock") || 5
  );

  /*
   * VALIDAR CAMPOS OBLIGATORIOS
   */

  if (!code || !name) {
    redirect(
      "/productos/nuevo?error=required-fields"
    );
  }

  /*
   * VALIDAR NÚMEROS
   */

  if (
    !Number.isFinite(priceCost) ||
    !Number.isFinite(priceSale) ||
    !Number.isInteger(stock) ||
    !Number.isInteger(minStock) ||
    priceCost < 0 ||
    priceSale < 0 ||
    stock < 0 ||
    minStock < 0
  ) {
    redirect(
      "/productos/nuevo?error=negative-values"
    );
  }

  /*
   * VALIDAR CÓDIGO DUPLICADO
   */

  const existingProduct =
    await prisma.product.findUnique({
      where: {
        code,
      },
    });

  if (existingProduct) {
    redirect(
      "/productos/nuevo?error=duplicate-code"
    );
  }

  /*
   * CATEGORÍA
   */

  const categoryValue =
    formData.get("categoryId");

  const categoryId =
    categoryValue
      ? Number(categoryValue)
      : null;

  if (
    categoryId !== null &&
    (
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    )
  ) {
    redirect(
      "/productos/nuevo?error=invalid-category"
    );
  }

  if (categoryId) {
    const category =
      await prisma.category.findUnique({
        where: {
          id: categoryId,
        },
      });

    if (!category) {
      redirect(
        "/productos/nuevo?error=invalid-category"
      );
    }
  }

  /*
   * PROVEEDOR
   */

  const supplierValue =
    formData.get("supplierId");

  const supplierId =
    supplierValue
      ? Number(supplierValue)
      : null;

  if (
    supplierId !== null &&
    (
      !Number.isInteger(supplierId) ||
      supplierId <= 0
    )
  ) {
    redirect(
      "/productos/nuevo?error=invalid-supplier"
    );
  }

  if (supplierId) {
    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id: supplierId,
        },
      });

    if (!supplier) {
      redirect(
        "/productos/nuevo?error=invalid-supplier"
      );
    }
  }

  /*
   * ==========================================
   * CREAR PRODUCTO + KARDEX
   * ==========================================
   */

  try {
    await prisma.$transaction(
      async (tx) => {
        /*
         * CREAR PRODUCTO
         */

        const product =
          await tx.product.create({
            data: {
              code,
              name,
              brand,
              priceCost,
              priceSale,
              stock,
              minStock,
              description,
              categoryId,
              supplierId,
            },
          });

        /*
         * REGISTRAR STOCK INICIAL
         *
         * Solo generamos movimiento
         * cuando el producto nace
         * con existencias mayores a 0.
         */

        if (stock > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: product.id,

              type: "ENTRADA",

              quantity: stock,

              previousStock: 0,

              newStock: stock,

              reason:
                "Inventario inicial",
            },
          });
        }
      }
    );
  } catch (error) {
    console.error(
      "Error creando producto:",
      error
    );

    redirect(
      "/productos/nuevo?error=server-error"
    );
  }

  redirect("/productos");
}

/*
 * ==========================================
 * PÁGINA NUEVO PRODUCTO
 * ==========================================
 */

export default async function NuevoProductoPage({
  searchParams,
}: Props) {
  /*
   * SEGURIDAD DE LA PÁGINA
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

  /*
   * DATOS PARA SELECTORES
   */

  const [
    categories,
    suppliers,
  ] = await Promise.all([
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.supplier.findMany({
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        {/* ENCABEZADO */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Nuevo producto
            </h1>

            <p className="text-slate-500">
              Registra un producto nuevo en el inventario.
            </p>
          </div>

          <Link
            href="/productos"
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            ← Volver
          </Link>
        </div>

        {/* ERROR: DUPLICADO */}
        {params.error ===
          "duplicate-code" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Ya existe un producto registrado con ese código. Usa un código diferente.
          </div>
        )}

        {/* ERROR: VALORES */}
        {params.error ===
          "negative-values" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Los precios, stock y stock mínimo deben contener valores válidos y no pueden ser negativos.
          </div>
        )}

        {/* ERROR: CAMPOS */}
        {params.error ===
          "required-fields" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El código y el nombre del producto son obligatorios.
          </div>
        )}

        {/* ERROR: CATEGORÍA */}
        {params.error ===
          "invalid-category" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            La categoría seleccionada no es válida.
          </div>
        )}

        {/* ERROR: PROVEEDOR */}
        {params.error ===
          "invalid-supplier" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El proveedor seleccionado no es válido.
          </div>
        )}

        {/* ERROR: SERVIDOR */}
        {params.error ===
          "server-error" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudo crear el producto. Revisa la consola del servidor e inténtalo nuevamente.
          </div>
        )}

        {/* AVISO DE TRAZABILIDAD */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">
            Stock inicial con trazabilidad
          </p>

          <p className="mt-1">
            Si registras existencias iniciales mayores que cero, el sistema creará automáticamente una entrada de inventario con motivo “Inventario inicial” y la mostrará en el Kardex.
          </p>
        </div>

        {/* FORMULARIO */}
        <form
          action={createProduct}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <input
            name="code"
            className="rounded-xl border px-4 py-3"
            placeholder="Código"
            required
          />

          <input
            name="name"
            className="rounded-xl border px-4 py-3"
            placeholder="Nombre del producto"
            required
          />

          <input
            name="brand"
            className="rounded-xl border px-4 py-3"
            placeholder="Marca"
          />

          <input
            name="priceCost"
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border px-4 py-3"
            placeholder="Precio costo"
          />

          <input
            name="priceSale"
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border px-4 py-3"
            placeholder="Precio venta"
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Stock inicial
            </label>

            <input
              name="stock"
              type="number"
              min="0"
              step="1"
              defaultValue={0}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Stock inicial"
            />

            <p className="mt-1 text-xs text-slate-500">
              Se registrará en el Kardex como Inventario inicial.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Stock mínimo
            </label>

            <input
              name="minStock"
              type="number"
              min="0"
              step="1"
              defaultValue={5}
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Stock mínimo"
            />
          </div>

          <select
            name="categoryId"
            className="rounded-xl border px-4 py-3"
          >
            <option value="">
              Seleccione categoría
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {
                    category.name
                  }
                </option>
              )
            )}
          </select>

          <select
            name="supplierId"
            className="rounded-xl border px-4 py-3"
          >
            <option value="">
              Seleccione proveedor
            </option>

            {suppliers.map(
              (supplier) => (
                <option
                  key={
                    supplier.id
                  }
                  value={
                    supplier.id
                  }
                >
                  {
                    supplier.name
                  }
                </option>
              )
            )}
          </select>

          <textarea
            name="description"
            className="rounded-xl border px-4 py-3 md:col-span-2"
            placeholder="Descripción"
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-2"
          >
            Guardar producto
          </button>
        </form>
      </div>
    </main>
  );
}