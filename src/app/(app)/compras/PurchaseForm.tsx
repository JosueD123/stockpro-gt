"use client";

import { useMemo, useState } from "react";

import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  Hash,
  Package,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";

type Supplier = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  stock: number;
  priceCost: number;
};

type PurchaseItem = {
  rowId: number;
  productId: string;
  quantity: string;
  unitCost: string;
};

type Props = {
  suppliers: Supplier[];
  products: Product[];
  currency: string;
  createPurchase: (
    formData: FormData
  ) => Promise<void>;
};

function getCurrentDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function generatePurchaseNumber() {
  const now = new Date();

  const datePart = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("");

  const timePart = [
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    ),
  ].join("");

  return `COMP-${datePart}-${timePart}`;
}

export default function PurchaseForm({
  suppliers,
  products,
  currency,
  createPurchase,
}: Props) {
  const [
    items,
    setItems,
  ] =
    useState<PurchaseItem[]>([
      {
        rowId:
          Date.now(),

        productId:
          "",

        quantity:
          "1",

        unitCost:
          "",
      },
    ]);

  /*
   * ==========================================
   * TOTAL
   * ==========================================
   */

  const total =
    useMemo(() => {
      return items.reduce(
        (
          accumulator,
          item
        ) => {
          const quantity =
            Number(
              item.quantity
            );

          const unitCost =
            Number(
              item.unitCost
            );

          if (
            !Number.isFinite(
              quantity
            ) ||
            !Number.isFinite(
              unitCost
            )
          ) {
            return accumulator;
          }

          return (
            accumulator +
            quantity *
              unitCost
          );
        },
        0
      );
    }, [items]);

  /*
   * ==========================================
   * SERIALIZAR PRODUCTOS
   * ==========================================
   */

  const serializedItems =
    JSON.stringify(
      items.map(
        (item) => ({
          productId:
            Number(
              item.productId
            ),

          quantity:
            Number(
              item.quantity
            ),

          unitCost:
            Number(
              item.unitCost
            ),
        })
      )
    );

  /*
   * ==========================================
   * PRODUCTOS YA SELECCIONADOS
   * ==========================================
   *
   * Nos sirve para evitar que el mismo
   * producto se seleccione en dos filas.
   */

  const selectedProductIds =
    useMemo(
      () =>
        items
          .filter(
            (item) =>
              item.productId
          )
          .map(
            (item) =>
              Number(
                item.productId
              )
          ),
      [items]
    );

  /*
   * ==========================================
   * AGREGAR FILA
   * ==========================================
   */

  function addItem() {
    setItems(
      (
        currentItems
      ) => [
        ...currentItems,

        {
          rowId:
            Date.now() +
            Math.random(),

          productId:
            "",

          quantity:
            "1",

          unitCost:
            "",
        },
      ]
    );
  }

  /*
   * ==========================================
   * ELIMINAR FILA
   * ==========================================
   */

  function removeItem(
    rowId: number
  ) {
    setItems(
      (
        currentItems
      ) => {
        if (
          currentItems.length ===
          1
        ) {
          return currentItems;
        }

        return currentItems.filter(
          (item) =>
            item.rowId !==
            rowId
        );
      }
    );
  }

  /*
   * ==========================================
   * ACTUALIZAR CAMPO
   * ==========================================
   */

  function updateItem(
    rowId: number,
    field: keyof Omit<
      PurchaseItem,
      "rowId"
    >,
    value: string
  ) {
    setItems(
      (
        currentItems
      ) =>
        currentItems.map(
          (item) =>
            item.rowId ===
            rowId
              ? {
                  ...item,

                  [field]:
                    value,
                }
              : item
        )
    );
  }

  /*
   * ==========================================
   * CAMBIAR PRODUCTO
   * ==========================================
   */

  function handleProductChange(
    rowId: number,
    productId: string
  ) {
    const product =
      products.find(
        (
          currentProduct
        ) =>
          currentProduct.id ===
          Number(
            productId
          )
      );

    setItems(
      (
        currentItems
      ) =>
        currentItems.map(
          (item) =>
            item.rowId ===
            rowId
              ? {
                  ...item,

                  productId,

                  unitCost:
                    product
                      ? String(
                          product.priceCost
                        )
                      : "",
                }
              : item
        )
    );
  }

  return (
    <form
      action={
        createPurchase
      }
      className="p-7"
    >
      {/* DATOS SERIALIZADOS */}
      <input
        type="hidden"
        name="items"
        value={
          serializedItems
        }
      />

      {/* DATOS GENERALES */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* NÚMERO */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Hash
              size={17}
            />

            Número de compra
          </label>

          <input
            name="purchaseNumber"
            type="text"
            defaultValue={
              generatePurchaseNumber()
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            required
          />
        </div>

        {/* FECHA */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays
              size={17}
            />

            Fecha
          </label>

          <input
            name="purchaseDate"
            type="date"
            defaultValue={
              getCurrentDate()
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            required
          />
        </div>

        {/* PROVEEDOR */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Truck
              size={17}
            />

            Proveedor
          </label>

          <select
            name="supplierId"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            required
          >
            <option value="">
              Seleccione un proveedor
            </option>

            {suppliers.map(
              (
                supplier
              ) => (
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
        </div>
      </div>

      {/* PRODUCTOS */}
      <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Package
                size={19}
              />

              Productos comprados
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Define cantidades y costos unitarios.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addItem
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus
              size={17}
            />

            Agregar producto
          </button>
        </div>

        <div className="space-y-4 p-5">
          {items.map(
            (
              item,
              index
            ) => {
              const selectedProduct =
                products.find(
                  (
                    product
                  ) =>
                    product.id ===
                    Number(
                      item.productId
                    )
                );

              const subtotal =
                Number(
                  item.quantity ||
                    0
                ) *
                Number(
                  item.unitCost ||
                    0
                );

              return (
                <div
                  key={
                    item.rowId
                  }
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  {/* ENCABEZADO DE FILA */}
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">
                      Producto #
                      {index +
                        1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        removeItem(
                          item.rowId
                        )
                      }
                      disabled={
                        items.length ===
                        1
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Eliminar producto"
                    >
                      <Trash2
                        size={
                          18
                        }
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_0.7fr_1fr_1fr]">
                    {/* PRODUCTO */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Producto
                      </label>

                      <select
                        value={
                          item.productId
                        }
                        onChange={(
                          event
                        ) =>
                          handleProductChange(
                            item.rowId,
                            event
                              .target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                        required
                      >
                        <option value="">
                          Seleccione un producto
                        </option>

                        {products.map(
                          (
                            product
                          ) => {
                            /*
                             * El producto está ocupado
                             * si aparece en otra fila.
                             */

                            const isSelectedElsewhere =
                              selectedProductIds.includes(
                                product.id
                              ) &&
                              Number(
                                item.productId
                              ) !==
                                product.id;

                            return (
                              <option
                                key={
                                  product.id
                                }
                                value={
                                  product.id
                                }
                                disabled={
                                  isSelectedElsewhere
                                }
                              >
                                {
                                  product.code
                                }{" "}
                                —{" "}
                                {
                                  product.name
                                }
                                {isSelectedElsewhere
                                  ? " | Ya agregado"
                                  : ""}
                              </option>
                            );
                          }
                        )}
                      </select>

                      {selectedProduct && (
                        <p className="mt-2 text-xs text-slate-500">
                          Stock actual:{" "}
                          <span className="font-semibold text-slate-700">
                            {
                              selectedProduct.stock
                            }
                          </span>
                        </p>
                      )}
                    </div>

                    {/* CANTIDAD */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cantidad
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          item.quantity
                        }
                        onChange={(
                          event
                        ) =>
                          updateItem(
                            item.rowId,
                            "quantity",
                            event
                              .target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                        required
                      />
                    </div>

                    {/* COSTO */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Costo unitario
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                          {
                            currency
                          }
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.unitCost
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              item.rowId,
                              "unitCost",
                              event
                                .target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 py-3 pl-14 pr-4 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                          required
                        />
                      </div>
                    </div>

                    {/* SUBTOTAL */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Subtotal
                      </label>

                      <div className="flex min-h-[50px] items-center rounded-xl bg-slate-100 px-4 font-bold text-slate-900">
                        {
                          currency
                        }
                        {subtotal.toLocaleString(
                          "es-GT",
                          {
                            minimumFractionDigits:
                              2,

                            maximumFractionDigits:
                              2,
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* PIE */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px]">
        {/* OBSERVACIONES */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText
              size={17}
            />

            Observaciones
          </label>

          <textarea
            name="notes"
            placeholder="Factura, forma de pago, condiciones o información adicional..."
            className="min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {/* TOTAL */}
        <div className="rounded-2xl bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-2 text-slate-300">
            <CircleDollarSign
              size={20}
            />

            <span className="text-sm font-semibold">
              Total de la compra
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold">
            {
              currency
            }
            {total.toLocaleString(
              "es-GT",
              {
                minimumFractionDigits:
                  2,

                maximumFractionDigits:
                  2,
              }
            )}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {
              items.length
            }{" "}
            producto
            {items.length !==
            1
              ? "s"
              : ""}{" "}
            agregado
            {items.length !==
            1
              ? "s"
              : ""}
          </p>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
          >
            <Save
              size={19}
            />

            Registrar compra
          </button>
        </div>
      </div>
    </form>
  );
}