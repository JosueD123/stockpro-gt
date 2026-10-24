"use client";

import { Printer } from "lucide-react";

export default function PurchasePrintButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 print:hidden"
    >
      <Printer size={18} />
      Imprimir compra
    </button>
  );
}