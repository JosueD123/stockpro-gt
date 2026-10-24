import Link from "next/link";
import { redirect } from "next/navigation";

import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Eye,
  History,
  Plus,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";


function formatCurrency(value: number) {
  return `Q${value.toLocaleString(
    "es-GT",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}


function getCreditStatus(
  status?: string,
  dueDate?: Date | null
) {

  if (!status) {
    return null;
  }


  const today = new Date();


  if (
    status !== "PAID" &&
    dueDate &&
    dueDate < today
  ) {
    return {
      label: "Vencida",
      className:
        "bg-red-100 text-red-700",
    };
  }


  if (status === "PAID") {

    return {
      label: "Pagada",
      className:
        "bg-green-100 text-green-700",
    };

  }


  if (status === "PARTIAL") {

    return {
      label: "Parcial",
      className:
        "bg-blue-100 text-blue-700",
    };

  }


  return {
    label: "Pendiente",
    className:
      "bg-amber-100 text-amber-700",
  };

}



export default async function VentasPage() {


  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
    ]);


  if (!auth.ok) {
    redirect("/dashboard");
  }



  const [
    sales,
    business,
  ] = await Promise.all([


    prisma.sale.findMany({

      include: {

        customer: true,

        items: true,

        accountReceivable: true,

      },


      orderBy: {
        createdAt:
          "desc",
      },

    }),



    prisma.businessConfig.findFirst(),

  ]);




  const currencySymbol =
    business?.currency === "USD"
      ? "$"
      : business?.currency === "EUR"
        ? "€"
        : "Q";



  const totalSales =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total + sale.total,
      0
    );



  const creditPending =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        (
          sale.accountReceivable?.balance ||
          0
        ),
      0
    );



  const creditSales =
    sales.filter(
      (sale) =>
        sale.paymentType === "CREDIT"
    ).length;



  return (

    <main className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-7xl">


        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">


          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-700">

              <ShoppingCart size={17}/>

              Módulo de ventas

            </div>


            <h1 className="text-3xl font-bold text-slate-900">

              Ventas

            </h1>


            <p className="text-slate-500">

              Registro y control de ventas del negocio.

            </p>


          </div>



          <div className="flex flex-col gap-3 sm:flex-row">


            <Link
              href="/ventas/historial"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-blue-50"
            >

              <History size={18}/>

              Historial

            </Link>



            <Link
              href="/ventas/nueva"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >

              <Plus size={18}/>

              Nueva venta

            </Link>


          </div>


        </header>





        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">


          <div className="rounded-2xl bg-white p-6 shadow">

            <ReceiptText className="mb-3 text-slate-700"/>

            <p className="text-sm text-slate-500">
              Ventas registradas
            </p>


            <h2 className="text-3xl font-bold">
              {sales.length}
            </h2>


          </div>




          <div className="rounded-2xl bg-white p-6 shadow">

            <BadgeDollarSign className="mb-3 text-green-600"/>

            <p className="text-sm text-slate-500">
              Total vendido
            </p>


            <h2 className="text-2xl font-bold">
              {currencySymbol}
              {totalSales.toLocaleString(
                "es-GT",
                {
                  minimumFractionDigits:2,
                }
              )}
            </h2>


          </div>




          <div className="rounded-2xl bg-white p-6 shadow">

            <CreditCard className="mb-3 text-blue-600"/>

            <p className="text-sm text-slate-500">
              Ventas crédito
            </p>


            <h2 className="text-3xl font-bold">
              {creditSales}
            </h2>


          </div>





          <div className="rounded-2xl bg-white p-6 shadow">

            <WalletCards className="mb-3 text-red-600"/>

            <p className="text-sm text-slate-500">
              Pendiente por cobrar
            </p>


            <h2 className="text-2xl font-bold">
              {currencySymbol}
              {creditPending.toFixed(2)}
            </h2>


          </div>


        </section>





        <section className="overflow-hidden rounded-2xl bg-white shadow">


          <div className="overflow-x-auto">


            <table className="w-full min-w-[950px] text-sm">


              <thead className="bg-slate-900 text-white">

                <tr>

                  <th className="p-4 text-left">
                    Fecha
                  </th>


                  <th className="p-4 text-left">
                    Cliente
                  </th>


                  <th className="p-4 text-center">
                    Pago
                  </th>


                  <th className="p-4 text-center">
                    Estado
                  </th>


                  <th className="p-4 text-center">
                    Productos
                  </th>


                  <th className="p-4 text-right">
                    Total
                  </th>


                  <th className="p-4 text-center">
                    Acción
                  </th>


                </tr>


              </thead>




              <tbody>


              {
                sales.map(
                  (sale)=>(


                  <tr
                    key={sale.id}
                    className="border-b hover:bg-slate-50"
                  >


                    <td className="p-4">

                      {new Date(
                        sale.createdAt
                      ).toLocaleString(
                        "es-GT"
                      )}

                    </td>



                    <td className="p-4">

                      <p className="font-semibold">

                        {
                          sale.customer?.name ||
                          "Consumidor final"
                        }

                      </p>


                      <p className="text-xs text-slate-500">

                        Venta #{sale.id}

                      </p>


                    </td>




                    <td className="p-4 text-center">


                      {
                        sale.paymentType === "CREDIT"

                        ?

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          Crédito
                        </span>

                        :

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Contado
                        </span>

                      }


                    </td>





                    <td className="p-4 text-center">


                    {
                      sale.accountReceivable

                      ?

                      (() => {

                        const status =
                          getCreditStatus(
                            sale.accountReceivable.status,
                            sale.accountReceivable.dueDate
                          );

                        return (

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.className}`}
                          >

                            {status?.label}

                          </span>

                        );

                      })()

                      :

                      <span className="text-slate-400">
                        —
                      </span>

                    }


                    </td>




                    <td className="p-4 text-center">

                      {sale.items.length}

                    </td>




                    <td className="p-4 text-right font-semibold">

                      {currencySymbol}
                      {sale.total.toFixed(2)}

                    </td>




                    <td className="p-4 text-center">


                      <Link
                        href={`/ventas/${sale.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                      >

                        <Eye size={13}/>

                        Ver

                      </Link>


                    </td>



                  </tr>


                ))

              }


              </tbody>


            </table>


          </div>


        </section>


      </div>


    </main>

  );
}