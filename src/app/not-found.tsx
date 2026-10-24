import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full text-center">

        <div className="text-7xl mb-4">
          📦
        </div>

        <h1 className="text-5xl font-extrabold text-slate-900 mb-2">
          404
        </h1>

        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Página no encontrada
        </h2>

        <p className="text-slate-500 mb-8">
          La página que intentas visitar no existe o fue movida.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition"
        >
          Volver al Dashboard
        </Link>

      </div>
    </main>
  );
}