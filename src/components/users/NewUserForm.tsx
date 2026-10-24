"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ArrowLeft,
  Mail,
  Save,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

type Role =
  | "ADMIN"
  | "SELLER"
  | "VIEWER";

export default function NewUserForm() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState<Role>("SELLER");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/usuarios",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
              email,
              password,
              role,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "No se pudo crear el usuario."
        );

        return;
      }

      router.push("/usuarios");
      router.refresh();
    } catch {
      setError(
        "Ocurrió un error al crear el usuario."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">
              <UserPlus size={17} />

              Administración de usuarios
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Nuevo usuario
            </h1>

            <p className="mt-1 text-slate-500">
              Crea una nueva cuenta de acceso para ControlStock Pro.
            </p>
          </div>

          <Link
            href="/usuarios"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-300"
          >
            <ArrowLeft size={18} />

            Volver
          </Link>
        </header>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ShieldCheck size={21} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Datos de acceso
                </h2>

                <p className="text-sm text-slate-500">
                  Ingresa la información de la nueva cuenta.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nombre completo
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Ej. María López"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Mail size={16} />

                Correo electrónico
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="usuario@empresa.com"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Rol
              </label>

              <select
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target
                      .value as Role
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              >
                <option value="ADMIN">
                  Administrador
                </option>

                <option value="SELLER">
                  Vendedor
                </option>

                <option value="VIEWER">
                  Consulta
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Contraseña
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                La contraseña se guardará protegida con bcrypt.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 md:col-span-2">
              <p className="font-semibold">
                Permisos del rol
              </p>

              <p className="mt-1">
                Los permisos definitivos serán controlados por el sistema según el rol seleccionado.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
            >
              <Save size={18} />

              {loading
                ? "Creando usuario..."
                : "Guardar usuario"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}