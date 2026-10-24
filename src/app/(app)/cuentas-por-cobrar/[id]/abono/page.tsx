import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  DollarSign,
  Save,
  User,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

import { createReceivablePayment } from "./actions";


type Props = {
  params: Promise<{
    id: string;
  }>;
};



function formatCurrency(
  value: number
) {
  return `Q${value.toFixed(2)}`;
}



function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "es-GT",
    {
      dateStyle: "medium",
    }
  ).format(date);
}



export default async function RegistrarAbonoPage(
  {
    params,
  }: Props
) {


  const auth =
    await requireRole([
      "ADMIN",
      "SELLER",
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

      where:{
        id: accountId,
      },


      include:{
        customer:true,
      },

    });



  if (!account) {
    notFound();
  }



  if (
    account.balance <= 0
  ) {

    return (

      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">

          <h1 className="text-2xl font-bold text-slate-900">
            Cuenta liquidada
          </h1>


          <p className="mt-2 text-slate-500">
            Esta cuenta ya no tiene saldo pendiente.
          </p>


          <Link
            href={`/cuentas-por-cobrar/${account.id}`}
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
          >

            Volver al detalle

          </Link>

        </div>

      </main>

    );

  }





  return (

    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">


      <div className="mx-auto max-w-3xl">


        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">


          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">

              <CreditCard size={17}/>

              Cuentas por cobrar

            </div>


            <h1 className="text-3xl font-bold text-slate-900">

              Registrar abono

            </h1>


            <p className="mt-1 text-slate-500">

              Registra un pago realizado por el cliente.

            </p>


          </div>




          <Link
            href={`/cuentas-por-cobrar/${account.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-300"
          >

            <ArrowLeft size={18}/>

            Volver

          </Link>


        </header>





        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">


          <h2 className="mb-5 text-xl font-bold text-slate-900">

            Información de la cuenta

          </h2>



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




            <div>

              <p className="text-sm text-slate-500">
                Saldo pendiente
              </p>


              <p className="text-2xl font-bold text-red-700">

                {formatCurrency(
                  account.balance
                )}

              </p>

            </div>




            <div>

              <p className="text-sm text-slate-500">
                Total abonado
              </p>


              <p className="text-2xl font-bold text-green-700">

                {formatCurrency(
                  account.paidAmount
                )}

              </p>

            </div>


          </div>


        </section>





        <form
          action={createReceivablePayment}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >


          <input
            type="hidden"
            name="accountId"
            value={account.id}
          />



          <h2 className="mb-5 text-xl font-bold text-slate-900">

            Datos del abono

          </h2>




          <div className="space-y-5">


            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">

                Monto del abono

              </label>


              <input
                type="number"
                name="amount"
                step="0.01"
                max={account.balance}
                required
                placeholder="Ejemplo: 500.00"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />

            </div>





            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">

                Método de pago

              </label>


              <select
                name="paymentMethod"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >

                <option value="CASH">
                  Efectivo
                </option>


                <option value="TRANSFER">
                  Transferencia
                </option>


                <option value="DEPOSIT">
                  Depósito
                </option>


                <option value="CARD">
                  Tarjeta
                </option>


              </select>


            </div>





            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">

                Referencia

              </label>


              <input
                type="text"
                name="reference"
                placeholder="Número de boleta o referencia"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />

            </div>





            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">

                Notas

              </label>


              <textarea
                name="notes"
                rows={3}
                placeholder="Observaciones del pago"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />


            </div>




            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
            >

              <Save size={18}/>

              Registrar abono

            </button>


          </div>


        </form>



      </div>


    </main>

  );
}