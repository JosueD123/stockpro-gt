"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Hash,
  Package,
  Plus,
  ReceiptText,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";

type Customer = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  stock: number;
  priceSale: number;
};

type CartItem = {
  productId: number;
  quantity: number;
};

type Props = {
  customers: Customer[];
  products: Product[];
  currencySymbol: string;
  error?: string;

  createSale: (
    formData: FormData
  ) => Promise<void>;
};

function formatMoney(
  value: number,
  currencySymbol: string
) {
  return `${currencySymbol}${value.toLocaleString(
    "es-GT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function getErrorMessage(
  error?: string
) {
  switch (error) {
    case "stock":
      return {
        title:
          "Stock insuficiente",

        description:
          "Uno de los productos ya no tiene suficientes existencias para completar la venta.",
      };

    case "stock-changed":
      return {
        title:
          "El inventario cambió",

        description:
          "Otra operación modificó las existencias mientras registrabas la venta. Revisa las cantidades e inténtalo nuevamente.",
      };

    case "invalid-data":
      return {
        title:
          "Datos no válidos",

        description:
          "Revisa los datos generales de la venta.",
      };

    case "invalid-items":
      return {
        title:
          "Productos no válidos",

        description:
          "Revisa los productos y cantidades agregados a la venta.",
      };

    case "empty-sale":
      return {
        title:
          "Venta vacía",

        description:
          "Debes agregar al menos un producto antes de registrar la venta.",
      };

    case "duplicated-products":
      return {
        title:
          "Producto duplicado",

        description:
          "Cada producto debe aparecer una sola vez en la venta.",
      };

    case "product-not-found":
      return {
        title:
          "Producto no encontrado",

        description:
          "Uno de los productos seleccionados ya no existe.",
      };

    case "customer-not-found":
      return {
        title:
          "Cliente no encontrado",

        description:
          "El cliente seleccionado ya no existe.",
      };

    case "server-error":
      return {
        title:
          "No se pudo registrar la venta",

        description:
          "Ocurrió un error inesperado. Intenta nuevamente.",
      };

    default:
      return null;
  }
}

export default function NewSaleForm({
  customers,
  products,
  currencySymbol,
  error,
  createSale,
}: Props) {
  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    cart,
    setCart,
  ] = useState<CartItem[]>([]);

  const [
    localError,
    setLocalError,
  ] = useState("");

  const [
    paymentType,
    setPaymentType,
  ] = useState<"CASH" | "CREDIT">("CASH");

  const [
    dueDate,
    setDueDate,
  ] = useState("");

  /*
   * ==========================================
   * MAPA DE PRODUCTOS
   * ==========================================
   */

  const productMap =
    useMemo(
      () =>
        new Map(
          products.map(
            (product) => [
              product.id,
              product,
            ]
          )
        ),
      [products]
    );

  /*
   * ==========================================
   * TOTAL
   * ==========================================
   */

  const total =
    useMemo(
      () =>
        cart.reduce(
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
        ),
      [
        cart,
        productMap,
      ]
    );

  const serverError =
    getErrorMessage(error);

  function validateSale(event: React.FormEvent<HTMLFormElement>) {
    setLocalError("");

    if (paymentType === "CREDIT") {
      const formData = new FormData(event.currentTarget);
      const customerId = formData.get("customerId");

      if (!customerId) {
        event.preventDefault();
        setLocalError(
          "Las ventas al crédito requieren seleccionar un cliente."
        );
        return;
      }

      if (!dueDate) {
        event.preventDefault();
        setLocalError(
          "Selecciona una fecha de vencimiento para la venta a crédito."
        );
        return;
      }
    }

    if (cart.length === 0) {
      event.preventDefault();
      setLocalError(
        "Debes agregar al menos un producto antes de registrar la venta."
      );
    }
  }

  /*
   * ==========================================
   * AGREGAR PRODUCTO
   * ==========================================
   */

  function addProduct() {
    setLocalError("");

    const productId =
      Number(
        selectedProductId
      );

    if (
      !Number.isInteger(
        productId
      ) ||
      productId <= 0
    ) {
      setLocalError(
        "Selecciona un producto."
      );

      return;
    }

    if (
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0
    ) {
      setLocalError(
        "La cantidad debe ser mayor que cero."
      );

      return;
    }

    const product =
      productMap.get(
        productId
      );

    if (!product) {
      setLocalError(
        "El producto seleccionado no existe."
      );

      return;
    }

    if (
      product.stock <= 0
    ) {
      setLocalError(
        "El producto está agotado."
      );

      return;
    }

    if (
      quantity >
      product.stock
    ) {
      setLocalError(
        `Solo hay ${product.stock} unidad${
          product.stock === 1
            ? ""
            : "es"
        } disponible${
          product.stock === 1
            ? ""
            : "s"
        }.`
      );

      return;
    }

    const existingItem =
      cart.find(
        (item) =>
          item.productId ===
          productId
      );

    /*
     * Si ya existe, sumamos
     * la cantidad.
     */

    if (existingItem) {
      const newQuantity =
        existingItem.quantity +
        quantity;

      if (
        newQuantity >
        product.stock
      ) {
        setLocalError(
          `No puedes agregar más de ${product.stock} unidades de este producto.`
        );

        return;
      }

      setCart(
        (currentCart) =>
          currentCart.map(
            (item) =>
              item.productId ===
              productId
                ? {
                    ...item,

                    quantity:
                      newQuantity,
                  }
                : item
          )
      );
    } else {
      setCart(
        (currentCart) => [
          ...currentCart,

          {
            productId,
            quantity,
          },
        ]
      );
    }

    setSelectedProductId("");
    setQuantity(1);
  }

  /*
   * ==========================================
   * CAMBIAR CANTIDAD
   * ==========================================
   */

  function updateQuantity(
    productId: number,
    newQuantity: number
  ) {
    const product =
      productMap.get(
        productId
      );

    if (!product) {
      return;
    }

    if (
      !Number.isInteger(
        newQuantity
      ) ||
      newQuantity <= 0
    ) {
      return;
    }

    if (
      newQuantity >
      product.stock
    ) {
      return;
    }

    setCart(
      (currentCart) =>
        currentCart.map(
          (item) =>
            item.productId ===
            productId
              ? {
                  ...item,

                  quantity:
                    newQuantity,
                }
              : item
        )
    );
  }

  /*
   * ==========================================
   * ELIMINAR
   * ==========================================
   */

  function removeProduct(
    productId: number
  ) {
    setCart(
      (currentCart) =>
        currentCart.filter(
          (item) =>
            item.productId !==
            productId
        )
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* ENCABEZADO */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700">
              <ShoppingCart
                size={17}
              />

              <span>
                Módulo de ventas
              </span>
            </div>

            <h1 className="text-4xl font-bold text-slate-900">
              Nueva venta
            </h1>

            <p className="mt-1 text-slate-600">
              Agrega varios productos y registra toda la operación en un solo comprobante.
            </p>
          </div>

          <Link
            href="/ventas"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
          >
            <ArrowLeft
              size={18}
            />

            Volver
          </Link>
        </header>

        {/* ERROR DEL SERVIDOR */}
        {serverError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-semibold">
                {serverError.title}
              </p>

              <p>
                {serverError.description}
              </p>
            </div>
          </div>
        )}

        {/* ERROR LOCAL */}
        {localError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <CircleAlert
              className="mt-0.5 shrink-0"
              size={20}
            />

            <p>
              {localError}
            </p>
          </div>
        )}

        <form
          action={createSale}
          onSubmit={validateSale}
        >
          {/* ITEMS JSON */}
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              cart
            )}
          />

          <input
            type="hidden"
            name="paymentType"
            value={paymentType}
          />

          <input
            type="hidden"
            name="dueDate"
            value={dueDate}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            {/* IZQUIERDA */}
            <div className="space-y-6">
              {/* CLIENTE */}
              <section className="overflow-hidden rounded-2xl bg-white shadow-md">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <UserRound
                        size={21}
                      />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Cliente
                      </h2>

                      <p className="text-sm text-slate-500">
                        Selecciona el cliente de esta venta.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <select
                    name="customerId"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Consumidor final
                    </option>

                    {customers.map(
                      (customer) => (
                        <option
                          key={
                            customer.id
                          }
                          value={
                            customer.id
                          }
                        >
                          {
                            customer.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </section>

              {/* FORMA DE PAGO */}
              <section className="overflow-hidden rounded-2xl bg-white shadow-md">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <h2 className="text-xl font-bold text-slate-900">
                    Forma de pago
                  </h2>

                  <p className="text-sm text-slate-500">
                    Selecciona si la venta será de contado o crédito.
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType("CASH")}
                      className={`rounded-xl border px-4 py-3 text-left font-semibold transition ${
                        paymentType === "CASH"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-slate-300 text-slate-700"
                      }`}
                    >
                      Contado
                      <span className="block text-xs font-normal">
                        Pago completo al registrar la venta.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType("CREDIT")}
                      className={`rounded-xl border px-4 py-3 text-left font-semibold transition ${
                        paymentType === "CREDIT"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 text-slate-700"
                      }`}
                    >
                      Crédito
                      <span className="block text-xs font-normal">
                        Genera una cuenta por cobrar.
                      </span>
                    </button>
                  </div>

                  {paymentType === "CREDIT" && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Fecha de vencimiento
                      </label>

                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) =>
                          setDueDate(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* AGREGAR PRODUCTO */}
              <section className="overflow-hidden rounded-2xl bg-white shadow-md">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Package
                        size={21}
                      />
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Agregar producto
                      </h2>

                      <p className="text-sm text-slate-500">
                        Puedes agregar varios artículos a la misma venta.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[1fr_150px_auto]">
                  <select
                    value={
                      selectedProductId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedProductId(
                        event.target
                          .value
                      )
                    }
                    className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Seleccione un producto
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={
                            product.id
                          }
                          value={
                            product.id
                          }
                          disabled={
                            product.stock <=
                            0
                          }
                        >
                          {product.code} -{" "}
                          {product.name} | Stock:{" "}
                          {product.stock} |{" "}
                          {formatMoney(
                            product.priceSale,
                            currencySymbol
                          )}
                          {product.stock <=
                          0
                            ? " | Agotado"
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  <div className="relative">
                    <Hash
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        quantity
                      }
                      onChange={(
                        event
                      ) =>
                        setQuantity(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={
                      addProduct
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus
                      size={18}
                    />

                    Agregar
                  </button>
                </div>
              </section>

              {/* CARRITO */}
              <section className="overflow-hidden rounded-2xl bg-white shadow-md">
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <ReceiptText
                      size={21}
                      className="text-slate-700"
                    />

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        Productos de la venta
                      </h2>

                      <p className="text-sm text-slate-500">
                        {cart.length} producto
                        {cart.length ===
                        1
                          ? ""
                          : "s"}{" "}
                        agregado
                        {cart.length ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                  </div>
                </div>

                {cart.length >
                0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-4 text-left">
                            Producto
                          </th>

                          <th className="p-4 text-center">
                            Cantidad
                          </th>

                          <th className="p-4 text-right">
                            Precio
                          </th>

                          <th className="p-4 text-right">
                            Subtotal
                          </th>

                          <th className="p-4 text-center">
                            Acción
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {cart.map(
                          (item) => {
                            const product =
                              productMap.get(
                                item.productId
                              );

                            if (
                              !product
                            ) {
                              return null;
                            }

                            const subtotal =
                              product.priceSale *
                              item.quantity;

                            return (
                              <tr
                                key={
                                  item.productId
                                }
                                className="border-t border-slate-100"
                              >
                                <td className="p-4">
                                  <p className="font-semibold text-slate-900">
                                    {
                                      product.name
                                    }
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    Código:{" "}
                                    {
                                      product.code
                                    }{" "}
                                    | Stock:{" "}
                                    {
                                      product.stock
                                    }
                                  </p>
                                </td>

                                <td className="p-4 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    max={
                                      product.stock
                                    }
                                    value={
                                      item.quantity
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateQuantity(
                                        item.productId,
                                        Number(
                                          event
                                            .target
                                            .value
                                        )
                                      )
                                    }
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-center"
                                  />
                                </td>

                                <td className="p-4 text-right">
                                  {formatMoney(
                                    product.priceSale,
                                    currencySymbol
                                  )}
                                </td>

                                <td className="p-4 text-right font-bold text-slate-900">
                                  {formatMoney(
                                    subtotal,
                                    currencySymbol
                                  )}
                                </td>

                                <td className="p-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeProduct(
                                        item.productId
                                      )
                                    }
                                    className="inline-flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200"
                                    title="Quitar producto"
                                  >
                                    <Trash2
                                      size={17}
                                    />
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <ShoppingCart
                      size={44}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-semibold text-slate-700">
                      La venta está vacía
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Selecciona un producto y agrégalo a la operación.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* DERECHA / RESUMEN */}
            <aside className="h-fit rounded-2xl bg-white p-6 shadow-md xl:sticky xl:top-6">
              <div className="mb-5">
                <p className="text-sm font-semibold text-slate-500">
                  Resumen de venta
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Total
                </h2>
              </div>

              <div className="space-y-3 border-y border-slate-200 py-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Productos distintos
                  </span>

                  <span className="font-semibold text-slate-900">
                    {cart.length}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Unidades
                  </span>

                  <span className="font-semibold text-slate-900">
                    {cart.reduce(
                      (
                        accumulator,
                        item
                      ) =>
                        accumulator +
                        item.quantity,
                      0
                    )}
                  </span>
                </div>
              </div>

              <div className="py-6">
                <p className="text-sm text-slate-500">
                  Total de la venta
                </p>

                <p className="mt-2 text-4xl font-bold text-slate-900">
                  {formatMoney(
                    total,
                    currencySymbol
                  )}
                </p>
              </div>

              <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                <BadgeCheck
                  className="mt-0.5 shrink-0"
                  size={20}
                />

                <p>
                  La venta, los productos, el stock y el Kardex se guardarán en una sola transacción.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  cart.length ===
                  0
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart
                  size={19}
                />

                Registrar venta
              </button>
            </aside>
          </div>
        </form>
      </div>
    </main>
  );
}