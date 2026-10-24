"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function createReceivablePayment(
  formData: FormData
) {
  const auth = await requireRole([
    "ADMIN",
    "SELLER",
  ]);

  if (!auth.ok) {
    throw new Error(
      "No tienes permisos para registrar abonos."
    );
  }

  const accountId = Number(
    formData.get("accountId")
  );

  const amount = Number(
    formData.get("amount")
  );

  const paymentMethod = String(
    formData.get("paymentMethod") || ""
  ).trim();

  const reference = String(
    formData.get("reference") || ""
  ).trim();

  const notes = String(
    formData.get("notes") || ""
  ).trim();

  if (
    !Number.isInteger(accountId) ||
    accountId <= 0
  ) {
    throw new Error(
      "Cuenta inválida."
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "El monto del abono debe ser mayor a cero."
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      /*
       * ==========================================
       * BUSCAR CUENTA
       * ==========================================
       */

      const account =
        await tx.accountReceivable.findUnique({
          where: {
            id: accountId,
          },
        });

      if (!account) {
        throw new Error(
          "Cuenta por cobrar no encontrada."
        );
      }

      /*
       * ==========================================
       * VALIDAR SALDO
       * ==========================================
       */

      if (account.balance <= 0) {
        throw new Error(
          "Esta cuenta ya está pagada."
        );
      }

      if (amount > account.balance) {
        throw new Error(
          "El abono no puede ser mayor al saldo pendiente."
        );
      }

      /*
       * ==========================================
       * CALCULAR NUEVOS VALORES
       * ==========================================
       */

      const newPaidAmount =
        account.paidAmount + amount;

      const newBalance =
        account.balance - amount;

      let newStatus = "PENDING";

      if (newBalance <= 0) {
        newStatus = "PAID";
      } else if (newPaidAmount > 0) {
        newStatus = "PARTIAL";
      }

      /*
       * ==========================================
       * REGISTRAR ABONO
       * ==========================================
       */

      const payment =
        await tx.receivablePayment.create({
          data: {
            amount,

            paymentMethod:
              paymentMethod || null,

            reference:
              reference || null,

            notes:
              notes || null,

            accountReceivableId:
              account.id,
          },
        });

      /*
       * ==========================================
       * ACTUALIZAR CUENTA
       * ==========================================
       */

      const updatedAccount =
        await tx.accountReceivable.update({
          where: {
            id: account.id,
          },

          data: {
            paidAmount:
              newPaidAmount,

            balance:
              newBalance,

            status:
              newStatus,
          },
        });

      return {
        payment,
        account: updatedAccount,
      };
    }
  );

  /*
   * ==========================================
   * VOLVER AL DETALLE
   * ==========================================
   */

  redirect(
    `/cuentas-por-cobrar/${result.account.id}`
  );
}