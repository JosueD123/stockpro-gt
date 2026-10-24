"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition"
    >
      Imprimir ticket
    </button>
  );
}