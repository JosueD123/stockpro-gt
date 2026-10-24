import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Eye,
  Mail,
  Phone,
  PlusCircle,
  ReceiptText,
  User,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";


type Props = {
  params: Promise<{
    id: string;
  }>;
};


function formatCurrency(value: number) {
  return `Q${value.toFixed(2)}`;
}


function formatDate(date: Date) {
  return new Intl.DateTimeFormat(
    "es-GT",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


function getStatus(
  status: string,
  dueDate: Date
) {
  const today = new Date();


  if (
    status !== "PAID" &&
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
      label: "Pago parcial",
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



export default async function CuentaDetallePage(
  {
    params,
  }: Props
) {


  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
      "VIEWER",
    ]);


  if (!auth.ok) {
    return null;
  }



  const {
    id,
  } = await params;



  const accountId =
    Number(id);



  if (!accountId) {
    notFound();
  }



  const account =
    await prisma.accountReceivable.findUnique({

      where: {
        id: accountId,
      },

      include: {
        customer: true,

        sale: true,

        payments: {
          orderBy: {
            paymentDate:
              "desc",
          },
        },
      },

    });



  if (!account) {
    notFound();
  }



  const status =
    getStatus(
      account.status,
      account.dueDate
    );


  const paidPercentage =
    account.originalAmount > 0
      ? Math.round(
          (
            account.paidAmount /
            account.originalAmount
          ) * 100
        )
      : 0;



  const canPay =
    account.balance > 0 &&
    account.status !== "PAID";



  return (

    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">


      <div className="mx-auto max-w-5xl">


        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">


          <div>


            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">

              <CreditCard size={17}/>

              Cuenta por cobrar

            </div>



            <h1 className="text-3xl font-bold text-slate-900">

              Detalle de deuda

            </h1>


            <p className="mt-1 text-slate-500">

              Seguimiento completo de la venta realizada al crédito.

            </p>


          </div>



          <Link
            href="/cuentas-por-cobrar"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
          >

            <ArrowLeft size={18}/>

            Volver

          </Link>


        </header>





        <section className="grid grid-cols-1 gap-5 md:grid-cols-4 mb-6">


          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Deuda original
            </p>


            <h2 className="mt-2 text-2xl font-bold">
              {formatCurrency(
                account.originalAmount
              )}
            </h2>

          </div>



          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Abonado
            </p>


            <h2 className="mt-2 text-2xl font-bold text-green-700">
              {formatCurrency(
                account.paidAmount
              )}
            </h2>

          </div>




          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Saldo
            </p>


            <h2 className="mt-2 text-2xl font-bold text-red-700">
              {formatCurrency(
                account.balance
              )}
            </h2>

          </div>




          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Avance
            </p>


            <h2 className="mt-2 text-2xl font-bold text-blue-700">
              {paidPercentage}%
            </h2>

          </div>



        </section>





        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">


          <div className="mb-5 flex items-center justify-between">

            <h2 className="text-xl font-bold">
              Información general
            </h2>


            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>


          </div>




          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">


            <div className="flex gap-3">

              <User className="text-slate-500"/>

              <div>

                <p className="text-sm text-slate-500">
                  Cliente
                </p>


                <p className="font-semibold">
                  {account.customer.name}
                </p>

              </div>

            </div>




            <div className="flex gap-3">

              <CalendarDays className="text-slate-500"/>

              <div>

                <p className="text-sm text-slate-500">
                  Vencimiento
                </p>


                <p className="font-semibold">
                  {formatDate(
                    account.dueDate
                  )}
                </p>

              </div>

            </div>




            <div className="flex gap-3">

              <Phone className="text-slate-500"/>

              <div>

                <p className="text-sm text-slate-500">
                  Teléfono
                </p>


                <p className="font-semibold">
                  {account.customer.phone || "Sin teléfono"}
                </p>

              </div>

            </div>




            <div className="flex gap-3">

              <Mail className="text-slate-500"/>

              <div>

                <p className="text-sm text-slate-500">
                  Correo
                </p>


                <p className="font-semibold">
                  {account.customer.email || "Sin correo"}
                </p>

              </div>

            </div>

            <div className="flex gap-3">

              <ReceiptText className="text-slate-500"/>

              <div>

                <p className="text-sm text-slate-500">
                  Venta relacionada
                </p>

                <Link
                  href={`/ventas/${account.sale.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900"
                >
                  Venta #{account.sale.id}
                  <Eye size={14}/>
                </Link>

              </div>

            </div>


          </div>



          {account.notes && (

            <div className="mt-5 rounded-xl bg-slate-50 p-4">

              <p className="text-sm text-slate-500">
                Observaciones
              </p>

              <p className="font-medium">
                {account.notes}
              </p>

            </div>

          )}



        </section>





        {canPay && (

          <div className="mb-6">

            <Link
              href={`/cuentas-por-cobrar/${account.id}/abono`}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >

              <PlusCircle size={18}/>

              Registrar abono

            </Link>

          </div>

        )}




        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">


          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="text-xl font-bold">
              Historial de abonos
            </h2>

          </div>




          <div className="p-6">


            {
              account.payments.length === 0

              ?

              (

                <p className="text-slate-500">
                  No existen abonos registrados.
                </p>

              )

              :

              (

                <div className="space-y-4">

                  {
                    account.payments.map(
                      (payment)=>(

                        <div
                          key={payment.id}
                          className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-lg font-bold text-green-700">
                                {formatCurrency(
                                  payment.amount
                                )}
                              </p>

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                Método de pago
                              </p>

                              <p className="text-sm text-slate-500">
                                {payment.paymentMethod ||
                                  "Sin método registrado"}
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-sm font-semibold text-slate-700">
                                Fecha del abono
                              </p>

                              <p className="text-sm text-slate-500">
                                {formatDate(
                                  payment.paymentDate
                                )}
                              </p>
                            </div>
                          </div>

                          {payment.reference && (
                            <div className="mt-4 rounded-lg bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Referencia
                              </p>

                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {payment.reference}
                              </p>
                            </div>
                          )}

                          {payment.notes && (
                            <div className="mt-3 rounded-lg bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Notas
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                {payment.notes}
                              </p>
                            </div>
                          )}
                        </div>

                      )
                    )
                  }

                </div>

              )
            }


          </div>


        </section>



      </div>


    </main>

  );
}