"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@stockprogt.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al iniciar sesión");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <section className="bg-slate-900 text-white p-10 flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-4">ControlStock Pro</h1>
            <p className="text-slate-300 text-lg">
              Sistema profesional de inventario, ventas y control para pequeños negocios.
            </p>
          </div>

          <div className="mt-12 space-y-3 text-sm text-slate-300">
            <p>✔ Control de productos y existencias</p>
            <p>✔ Reportes de ventas e inventario</p>
            <p>✔ Ideal para repuestos, ferreterías, tiendas y farmacias</p>
          </div>
        </section>

        <section className="p-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Iniciar sesión
          </h2>
          <p className="text-slate-500 mb-8">
            Ingrese sus credenciales para acceder al sistema.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-800 transition disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar al sistema"}
            </button>
          </form>

          <div className="mt-8 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            <p className="font-semibold mb-1">Usuario de prueba:</p>
            <p>admin@stockprogt.com</p>
            <p>admin123</p>
          </div>
        </section>
      </div>
    </main>
  );
}