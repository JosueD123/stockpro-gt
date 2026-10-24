import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Eye,
  History,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  Truck,
} from "lucide-react";

import PurchaseForm from "./PurchaseForm";

type PageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type PurchaseItemInput = {
  productId: number;
  quantity: number;
  unitCost: number;
};

/*
 * ==========================================
 * CREAR COMPRA
 * ==========================================
 */

async function createPurchase(
  formData: FormData
) {
  "use server";

  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
   *
   * Solamente ADMIN puede registrar compras.
   */

  const auth =
    await requireRole([
      "ADMIN",
    ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  /*
   * ==========================================
   * DATOS GENERALES
   * ==========================================
   */

  const supplierId = Number(
    formData.get("supplierId")
  );

  const purchaseNumber = String(
    formData.get("purchaseNumber") || ""
  ).trim();

  const purchaseDateValue = String(
    formData.get("purchaseDate") || ""
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  const itemsJson = String(
    formData.get("items") || "[]"
  );

  /*
   * ==========================================
   * VALIDACIONES GENERALES
   * ==========================================
   */

  if (
    !Number.isInteger(supplierId) ||
    supplierId <= 0 ||
    !purchaseNumber ||
    !purchaseDateValue
  ) {
    redirect(
      "/compras?error=invalid-data"
    );
  }

  /*
   * ==========================================
   * INTERPRETAR PRODUCTOS
   * ==========================================
   */

  let items: PurchaseItemInput[] = [];

  try {
    const parsedItems =
      JSON.parse(itemsJson);

    if (
      !Array.isArray(parsedItems)
    ) {
      redirect(
        "/compras?error=invalid-items"
      );
    }

    items = parsedItems.map(
      (item) => ({
        productId:
          Number(item.productId),

        quantity:
          Number(item.quantity),

        unitCost:
          Number(item.unitCost),
      })
    );
  } catch {
    redirect(
      "/compras?error=invalid-items"
    );
  }

  /*
   * ==========================================
   * VALIDAR PRODUCTOS
   * ==========================================
   */

  const validItems =
    items.filter(
      (item) =>
        Number.isInteger(
          item.productId
        ) &&
        item.productId > 0 &&
        Number.isInteger(
          item.quantity
        ) &&
        item.quantity > 0 &&
        Number.isFinite(
          item.unitCost
        ) &&
        item.unitCost >= 0
    );

  if (
    validItems.length === 0 ||
    validItems.length !==
      items.length
  ) {
    redirect(
      "/compras?error=invalid-items"
    );
  }

  /*
   * NO PERMITIR EL MISMO PRODUCTO
   * DOS VECES EN LA MISMA COMPRA
   */

  const duplicatedProducts =
    validItems.some(
      (item, index) =>
        validItems.findIndex(
          (currentItem) =>
            currentItem.productId ===
            item.productId
        ) !== index
    );

  if (duplicatedProducts) {
    redirect(
      "/compras?error=duplicated-products"
    );
  }

  /*
   * ==========================================
   * FECHA
   * ==========================================
   */

  const purchaseDate =
    new Date(
      `${purchaseDateValue}T12:00:00`
    );

  if (
    Number.isNaN(
      purchaseDate.getTime()
    )
  ) {
    redirect(
      "/compras?error=invalid-date"
    );
  }

  /*
   * ==========================================
   * TRANSACCIÓN
   * ==========================================
   *
   * Compra + detalle + stock + costo +
   * Kardex se guardan juntos.
   */

  try {
    await prisma.$transaction(
      async (tx) => {
        /*
         * VALIDAR PROVEEDOR
         */

        const supplier =
          await tx.supplier.findUnique({
            where: {
              id: supplierId,
            },

            select: {
              id: true,
            },
          });

        if (!supplier) {
          throw new Error(
            "SUPPLIER_NOT_FOUND"
          );
        }

        /*
         * VALIDAR NÚMERO DE COMPRA
         */

        const existingPurchase =
          await tx.purchase.findUnique({
            where: {
              purchaseNumber,
            },
          });

        if (existingPurchase) {
          throw new Error(
            "PURCHASE_NUMBER_EXISTS"
          );
        }

        /*
         * OBTENER PRODUCTOS
         */

        const productIds =
          validItems.map(
            (item) =>
              item.productId
          );

        const products =
          await tx.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
          });

        if (
          products.length !==
          validItems.length
        ) {
          throw new Error(
            "PRODUCT_NOT_FOUND"
          );
        }

        /*
         * TOTAL DE LA COMPRA
         */

        const total =
          validItems.reduce(
            (
              accumulator,
              item
            ) =>
              accumulator +
              item.quantity *
                item.unitCost,
            0
          );

        /*
         * CREAR CABECERA DE COMPRA
         */

        const purchase =
          await tx.purchase.create({
            data: {
              purchaseNumber,

              purchaseDate,

              total,

              status:
                "COMPLETED",

              notes:
                notes || null,

              supplierId,
            },
          });

        /*
         * ======================================
         * PROCESAR CADA PRODUCTO
         * ======================================
         */

        for (
          const item of validItems
        ) {
          const product =
            products.find(
              (
                currentProduct
              ) =>
                currentProduct.id ===
                item.productId
            );

          if (!product) {
            throw new Error(
              "PRODUCT_NOT_FOUND"
            );
          }

          const previousStock =
            product.stock;

          const newStock =
            previousStock +
            item.quantity;

          const subtotal =
            item.quantity *
            item.unitCost;

          /*
           * DETALLE DE COMPRA
           */

          await tx.purchaseItem.create({
            data: {
              purchaseId:
                purchase.id,

              productId:
                product.id,

              quantity:
                item.quantity,

              unitCost:
                item.unitCost,

              subtotal,
            },
          });

          /*
           * ====================================
           * ACTUALIZAR INVENTARIO
           * ====================================
           */

          const updatedProduct =
            await tx.product.updateMany({
              where: {
                id: product.id,

                stock:
                  previousStock,
              },

              data: {
                stock:
                  newStock,

                priceCost:
                  item.unitCost,
              },
            });

          if (
            updatedProduct.count ===
            0
          ) {
            throw new Error(
              "STOCK_CHANGED"
            );
          }

          /*
           * ====================================
           * KARDEX
           * ====================================
           */

          await tx.inventoryMovement.create({
            data: {
              productId:
                product.id,

              type:
                "COMPRA",

              quantity:
                item.quantity,

              previousStock,

              newStock,

              reason:
                `Compra ${purchase.purchaseNumber}`,

              referenceId:
                purchase.id,
            },
          });
        }
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "SUPPLIER_NOT_FOUND"
    ) {
      redirect(
        "/compras?error=supplier-not-found"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "PURCHASE_NUMBER_EXISTS"
    ) {
      redirect(
        "/compras?error=purchase-number-exists"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "PRODUCT_NOT_FOUND"
    ) {
      redirect(
        "/compras?error=product-not-found"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "STOCK_CHANGED"
    ) {
      redirect(
        "/compras?error=stock-changed"
      );
    }

    console.error(
      "Error al registrar la compra:",
      error
    );

    redirect(
      "/compras?error=server-error"
    );
  }

  redirect(
    "/compras?success=purchase-created"
  );
}

/*
 * ==========================================
 * MENSAJES
 * ==========================================
 */

function getMessage(
  error?: string
) {
  switch (error) {
    case "invalid-data":
      return {
        title:
          "Datos incompletos",

        description:
          "Selecciona un proveedor, escribe el número de compra e indica la fecha.",
      };

    case "invalid-items":
      return {
        title:
          "Productos no válidos",

        description:
          "Agrega al menos un producto con cantidad y costo válidos.",
      };

    case "duplicated-products":
      return {
        title:
          "Producto duplicado",

        description:
          "Cada producto debe aparecer solamente una vez en la compra.",
      };

    case "invalid-date":
      return {
        title:
          "Fecha no válida",

        description:
          "Selecciona una fecha válida para registrar la compra.",
      };

    case "supplier-not-found":
      return {
        title:
          "Proveedor no encontrado",

        description:
          "El proveedor seleccionado no existe o fue eliminado.",
      };

    case "purchase-number-exists":
      return {
        title:
          "Número de compra duplicado",

        description:
          "Ya existe una compra registrada con ese número.",
      };

    case "product-not-found":
      return {
        title:
          "Producto no encontrado",

        description:
          "Uno de los productos seleccionados no existe o fue eliminado.",
      };

    case "stock-changed":
      return {
        title:
          "El inventario cambió",

        description:
          "El stock fue modificado durante el proceso. Intenta registrar nuevamente la compra.",
      };

    case "server-error":
      return {
        title:
          "No se pudo registrar la compra",

        description:
          "Ocurrió un error inesperado. Revisa la consola del servidor.",
      };

    default:
      return null;
  }
}

/*
 * ==========================================
 * PÁGINA DE COMPRAS
 * ==========================================
 */

export default async function ComprasPage({
  searchParams,
}: PageProps) {
  /*
   * ==========================================
   * SEGURIDAD
   * ==========================================
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

  const errorMessage =
    getMessage(
      params.error
    );

  /*
   * ==========================================
   * CONSULTAS
   * ==========================================
   */

  const [
    suppliers,
    products,
    purchases,
    businessConfig,
  ] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.product.findMany({
      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        priceCost: true,
      },
    }),

    prisma.purchase.findMany({
      include: {
        supplier: true,
        items: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 8,
    }),

    prisma.businessConfig.findFirst({
      select: {
        currency: true,
      },
    }),
  ]);

  /*
   * ==========================================
   * MONEDA
   * ==========================================
   */

  const currency =
    businessConfig?.currency ||
    "GTQ";

  const currencySymbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : "Q";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <header className="mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
                <ShoppingBag
                  size={17}
                />

                <span>
                  Abastecimiento e inventario
                </span>
              </div>

              <h1 className="text-4xl font-bold text-slate-900">
                Compras
              </h1>

              <p className="mt-1 text-slate-600">
                Registra compras a proveedores y actualiza automáticamente el stock y el Kardex.
              </p>
            </div>

            <Link
              href="/compras/historial"
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <History
                size={18}
              />

              Ver historial completo

              <ArrowRight
                size={17}
              />
            </Link>
          </div>
        </header>

        {/* ÉXITO */}
        {params.success ===
          "purchase-created" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <BadgeCheck
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                Compra registrada correctamente
              </p>

              <p>
                Los productos, costos, existencias y movimientos del Kardex fueron actualizados.
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                {
                  errorMessage.title
                }
              </p>

              <p>
                {
                  errorMessage.description
                }
              </p>
            </div>
          </div>
        )}

        {/* CONTENIDO */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          {/* NUEVA COMPRA */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="border-b border-slate-100 bg-slate-50 px-7 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <PackagePlus
                    size={21}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Nueva compra
                  </h2>

                  <p className="text-sm text-slate-500">
                    Agrega uno o varios productos a la operación.
                  </p>
                </div>
              </div>
            </div>

            <PurchaseForm
              suppliers={
                suppliers
              }
              products={
                products
              }
              currency={
                currencySymbol
              }
              createPurchase={
                createPurchase
              }
            />
          </div>

          {/* COMPRAS RECIENTES */}
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ReceiptText
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Compras recientes
                </h2>

                <p className="text-sm text-slate-500">
                  Últimas operaciones registradas.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {purchases.map(
                (purchase) => (
                  <div
                    key={
                      purchase.id
                    }
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {
                            purchase.purchaseNumber
                          }
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Truck
                            size={
                              13
                            }
                          />

                          {
                            purchase
                              .supplier
                              .name
                          }
                        </p>
                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Completada
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          {
                            purchase
                              .items
                              .length
                          }{" "}
                          producto
                          {purchase
                            .items
                            .length !==
                          1
                            ? "s"
                            : ""}
                        </p>

                        <p className="text-xs text-slate-500">
                          {new Date(
                            purchase.purchaseDate
                          ).toLocaleDateString(
                            "es-GT"
                          )}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-slate-900">
                        {currencySymbol}
                        {purchase.total.toLocaleString(
                          "es-GT",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <Link
                        href={`/compras/${purchase.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Eye
                          size={
                            17
                          }
                        />

                        Ver detalle

                        <ArrowRight
                          size={
                            16
                          }
                        />
                      </Link>
                    </div>
                  </div>
                )
              )}

              {purchases.length ===
                0 && (
                <div className="py-10 text-center">
                  <ReceiptText
                    className="mx-auto mb-3 text-slate-300"
                    size={38}
                  />

                  <p className="font-semibold text-slate-700">
                    Sin compras registradas
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Las nuevas compras aparecerán aquí.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}