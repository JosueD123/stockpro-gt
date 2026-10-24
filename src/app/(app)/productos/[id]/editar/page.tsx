import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

/*
 * ==========================================
 * ACTUALIZAR PRODUCTO
 * ==========================================
 */

async function updateProduct(
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
   * DATOS
   */

  const id = Number(
    formData.get("id")
  );

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

  const minStock = Number(
    formData.get("minStock") || 5
  );

  /*
   * VALIDAR ID
   */

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    redirect("/productos");
  }

  /*
   * VALIDAR CAMPOS OBLIGATORIOS
   */

  if (!code || !name) {
    redirect(
      `/productos/${id}/editar?error=required-fields`
    );
  }

  /*
   * VALIDAR VALORES NUMÉRICOS
   */

  if (
    !Number.isFinite(priceCost) ||
    !Number.isFinite(priceSale) ||
    !Number.isInteger(minStock) ||
    priceCost < 0 ||
    priceSale < 0 ||
    minStock < 0
  ) {
    redirect(
      `/productos/${id}/editar?error=invalid-values`
    );
  }

  /*
   * VERIFICAR QUE EL PRODUCTO EXISTA
   */

  const currentProduct =
    await prisma.product.findUnique({
      where: {
        id,
      },
    });

  if (!currentProduct) {
    redirect("/productos");
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

  if (
    existingProduct &&
    existingProduct.id !== id
  ) {
    redirect(
      `/productos/${id}/editar?error=duplicate-code`
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
      `/productos/${id}/editar?error=invalid-category`
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
        `/productos/${id}/editar?error=invalid-category`
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
      `/productos/${id}/editar?error=invalid-supplier`
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
        `/productos/${id}/editar?error=invalid-supplier`
      );
    }
  }

  /*
   * ACTUALIZAR PRODUCTO
   *
   * IMPORTANTE:
   * El stock NO se modifica aquí.
   * Los cambios de existencias deben pasar
   * por Entradas, Ajustes, Compras o Ventas.
   */

  await prisma.product.update({
    where: {
      id,
    },

    data: {
      code,
      name,
      brand,
      priceCost,
      priceSale,
      minStock,
      description,
      categoryId,
      supplierId,
    },
  });

  redirect("/productos");
}

/*
 * ==========================================
 * PÁGINA EDITAR PRODUCTO
 * ==========================================
 */

export default async function EditarProductoPage({
  params,
  searchParams,
}: Props) {
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

  const { id } =
    await params;

  const query =
    await searchParams;

  const productId =
    Number(id);

  if (
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    redirect("/productos");
  }

  /*
   * CONSULTAS
   */

  const [
    product,
    categories,
    suppliers,
  ] = await Promise.all([
    prisma.product.findUnique({
      where: {
        id: productId,
      },
    }),

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

  if (!product) {
    redirect("/productos");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        {/* ENCABEZADO */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Editar producto
            </h1>

            <p className="text-slate-500">
              Actualiza la información del producto seleccionado.
            </p>
          </div>

          <Link
            href="/productos"
            className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            ← Volver
          </Link>
        </div>

        {/* ERRORES */}
        {query.error ===
          "duplicate-code" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Ya existe otro producto registrado con ese código. Usa un código diferente.
          </div>
        )}

        {query.error ===
          "invalid-values" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Los precios y el stock mínimo deben contener valores válidos y no pueden ser negativos.
          </div>
        )}

        {query.error ===
          "required-fields" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El código y el nombre del producto son obligatorios.
          </div>
        )}

        {query.error ===
          "invalid-category" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            La categoría seleccionada no es válida.
          </div>
        )}

        {query.error ===
          "invalid-supplier" && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            El proveedor seleccionado no es válido.
          </div>
        )}

        {/* AVISO DE STOCK */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">
            Stock actual: {product.stock}
          </p>

          <p className="mt-1 text-sm text-blue-800">
            El stock no se modifica desde esta pantalla. Para aumentar o corregir existencias utiliza los módulos de Entradas o Ajustes de inventario.
          </p>
        </div>

        {/* FORMULARIO */}
        <form
          action={updateProduct}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <input
            type="hidden"
            name="id"
            defaultValue={
              product.id
            }
          />

          <input
            name="code"
            defaultValue={
              product.code
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Código"
            required
          />

          <input
            name="name"
            defaultValue={
              product.name
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Nombre del producto"
            required
          />

          <input
            name="brand"
            defaultValue={
              product.brand || ""
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Marca"
          />

          <input
            name="priceCost"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              product.priceCost
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Precio costo"
          />

          <input
            name="priceSale"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              product.priceSale
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Precio venta"
          />

          {/* STOCK SOLO LECTURA */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Stock actual
            </label>

            <input
              type="number"
              value={product.stock}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-semibold text-slate-600"
            />
          </div>

          <input
            name="minStock"
            type="number"
            min="0"
            step="1"
            defaultValue={
              product.minStock
            }
            className="rounded-xl border px-4 py-3"
            placeholder="Stock mínimo"
          />

          <select
            name="categoryId"
            defaultValue={
              product.categoryId || ""
            }
            className="rounded-xl border px-4 py-3"
          >
            <option value="">
              Seleccione categoría
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              )
            )}
          </select>

          <select
            name="supplierId"
            defaultValue={
              product.supplierId || ""
            }
            className="rounded-xl border px-4 py-3"
          >
            <option value="">
              Seleccione proveedor
            </option>

            {suppliers.map(
              (supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name}
                </option>
              )
            )}
          </select>

          <textarea
            name="description"
            defaultValue={
              product.description ||
              ""
            }
            className="rounded-xl border px-4 py-3 md:col-span-2"
            placeholder="Descripción"
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