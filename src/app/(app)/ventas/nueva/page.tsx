import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { redirect } from "next/navigation";

import NewSaleForm from "@/components/sales/NewSaleForm";

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type SaleItemInput = {
  productId: number;
  quantity: number;
};

/*
 * ==========================================
 * CREAR VENTA
 * ==========================================
 */

async function createSale(
  formData: FormData
) {
  "use server";

  /*
   * SEGURIDAD
   */

  const auth = await requireRole([
    "ADMIN",
    "SELLER",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  /*
   * DATOS GENERALES
   */

  const customerIdRaw =
    formData.get("customerId");

  const customerId =
    customerIdRaw
      ? Number(customerIdRaw)
      : null;

  const paymentType =
    String(
      formData.get("paymentType") || "CASH"
    );

  const dueDateRaw =
    formData.get("dueDate");

  const dueDate =
    dueDateRaw
      ? new Date(String(dueDateRaw))
      : null;

  const itemsJson = String(
    formData.get("items") || "[]"
  );

  /*
   * VALIDAR CLIENTE
   */

  if (
    paymentType === "CREDIT" &&
    customerId === null
  ) {
    redirect(
      "/ventas/nueva?error=credit-requires-customer"
    );
  }

  if (
    paymentType === "CREDIT" &&
    !dueDate
  ) {
    redirect(
      "/ventas/nueva?error=credit-requires-date"
    );
  }

  if (
    customerId !== null &&
    (
      !Number.isInteger(customerId) ||
      customerId <= 0
    )
  ) {
    redirect(
      "/ventas/nueva?error=invalid-data"
    );
  }

  /*
   * ==========================================
   * INTERPRETAR PRODUCTOS
   * ==========================================
   */

  let parsedItems: unknown;

  try {
    parsedItems =
      JSON.parse(itemsJson);
  } catch {
    redirect(
      "/ventas/nueva?error=invalid-items"
    );
  }

  if (
    !Array.isArray(parsedItems)
  ) {
    redirect(
      "/ventas/nueva?error=invalid-items"
    );
  }

  const items: SaleItemInput[] =
    parsedItems.map((item) => {
      const currentItem =
        item as {
          productId?: unknown;
          quantity?: unknown;
        };

      return {
        productId:
          Number(
            currentItem.productId
          ),

        quantity:
          Number(
            currentItem.quantity
          ),
      };
    });

  /*
   * VALIDAR PRODUCTOS
   */

  if (items.length === 0) {
    redirect(
      "/ventas/nueva?error=empty-sale"
    );
  }

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
        item.quantity > 0
    );

  if (
    validItems.length !==
    items.length
  ) {
    redirect(
      "/ventas/nueva?error=invalid-items"
    );
  }

  /*
   * NO PERMITIR PRODUCTOS DUPLICADOS
   */

  const productIds =
    validItems.map(
      (item) =>
        item.productId
    );

  const uniqueProductIds =
    new Set(
      productIds
    );

  if (
    uniqueProductIds.size !==
    productIds.length
  ) {
    redirect(
      "/ventas/nueva?error=duplicated-products"
    );
  }

  /*
   * ==========================================
   * TRANSACCIÓN
   * ==========================================
   */

  try {
    await prisma.$transaction(
      async (tx) => {
        /*
         * VALIDAR CLIENTE
         */

        if (
          customerId !== null
        ) {
          const customer =
            await tx.customer.findUnique({
              where: {
                id: customerId,
              },

              select: {
                id: true,
              },
            });

          if (!customer) {
            throw new Error(
              "CUSTOMER_NOT_FOUND"
            );
          }
        }

        /*
         * OBTENER PRODUCTOS
         */

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
         * MAPA DE PRODUCTOS
         */

        const productMap =
          new Map(
            products.map(
              (product) => [
                product.id,
                product,
              ]
            )
          );

        /*
         * VALIDAR STOCK DE TODOS
         */

        for (
          const item of validItems
        ) {
          const product =
            productMap.get(
              item.productId
            );

          if (!product) {
            throw new Error(
              "PRODUCT_NOT_FOUND"
            );
          }

          if (
            product.stock <
            item.quantity
          ) {
            throw new Error(
              "INSUFFICIENT_STOCK"
            );
          }
        }

        /*
         * TOTAL CALCULADO EN SERVIDOR
         */

        const total =
          validItems.reduce(
            (
              accumulator,
              item
            ) => {
              const product =
                productMap.get(
                  item.productId
                );

              if (!product) {
                return accumulator;
              }

              return (
                accumulator +
                product.priceSale *
                  item.quantity
              );
            },
            0
          );

        /*
         * ======================================
         * CREAR VENTA
         * ======================================
         */

        const sale =
          await tx.sale.create({
            data: {
              total,

              customerId,

              paymentType,

              dueDate,

              items: {
                create:
                  validItems.map(
                    (item) => {
                      const product =
                        productMap.get(
                          item.productId
                        );

                      if (!product) {
                        throw new Error(
                          "PRODUCT_NOT_FOUND"
                        );
                      }

                      return {
                        productId:
                          product.id,

                        quantity:
                          item.quantity,

                        price:
                          product.priceSale,
                      };
                    }
                  ),
              },
            },
          });

        if (
          paymentType === "CREDIT"
        ) {
          await tx.accountReceivable.create({
            data: {
              originalAmount: total,
              paidAmount: 0,
              balance: total,
              status: "PENDING",
              dueDate: dueDate!,
              saleId: sale.id,
              customerId: customerId!,
            },
          });
        }

        /*
         * ======================================
         * ACTUALIZAR STOCK + KARDEX
         * ======================================
         */

        for (
          const item of validItems
        ) {
          const product =
            productMap.get(
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
            previousStock -
            item.quantity;

          /*
           * CONCURRENCIA
           *
           * Solo actualizamos si el stock
           * continúa siendo exactamente
           * el que leímos.
           */

          const updatedProduct =
            await tx.product.updateMany({
              where: {
                id:
                  product.id,

                stock:
                  previousStock,
              },

              data: {
                stock:
                  newStock,
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
           * KARDEX
           */

          await tx.inventoryMovement.create({
            data: {
              productId:
                product.id,

              type:
                "VENTA",

              quantity:
                -item.quantity,

              previousStock,

              newStock,

              reason:
                `Venta #${sale.id}`,

              referenceId:
                sale.id,
            },
          });
        }
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "CUSTOMER_NOT_FOUND"
    ) {
      redirect(
        "/ventas/nueva?error=customer-not-found"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "PRODUCT_NOT_FOUND"
    ) {
      redirect(
        "/ventas/nueva?error=product-not-found"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "INSUFFICIENT_STOCK"
    ) {
      redirect(
        "/ventas/nueva?error=stock"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "STOCK_CHANGED"
    ) {
      redirect(
        "/ventas/nueva?error=stock-changed"
      );
    }

    console.error(
      "Error al registrar la venta:",
      error
    );

    redirect(
      "/ventas/nueva?error=server-error"
    );
  }

  redirect("/ventas");
}

/*
 * ==========================================
 * PÁGINA
 * ==========================================
 */

export default async function NuevaVentaPage({
  searchParams,
}: Props) {
  /*
   * SEGURIDAD
   */

  const auth = await requireRole([
    "ADMIN",
    "SELLER",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const params =
    await searchParams;

  /*
   * DATOS
   */

  const [
    customers,
    products,
    business,
  ] = await Promise.all([
    prisma.customer.findMany({
      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
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
        brand: true,
        stock: true,
        priceSale: true,
      },
    }),

    prisma.businessConfig.findFirst({
      select: {
        currency: true,
      },
    }),
  ]);

  const currencySymbol =
    business?.currency === "USD"
      ? "$"
      : business?.currency === "EUR"
        ? "€"
        : "Q";

  return (
    <NewSaleForm
      customers={customers}
      products={products}
      currencySymbol={
        currencySymbol
      }
      error={
        params.error
      }
      createSale={
        createSale
      }
    />
  );
}