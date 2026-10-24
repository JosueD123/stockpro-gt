import { prisma } from "@/lib/prisma";

export default async function AcercaDePage() {
  const business = await prisma.businessConfig.findFirst();

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto">

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Acerca de
          </h1>

          <p className="text-slate-500">
            Información del sistema y de la instalación.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow p-8 space-y-8">

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {business?.name || "ControlStock Pro"}
            </h2>

            <p className="text-slate-500 mt-2">
              Sistema profesional para administración de inventario, ventas,
              clientes, proveedores y reportes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-slate-50 rounded-xl p-5 border">
              <h3 className="font-bold text-slate-900 mb-3">
                Información del sistema
              </h3>

              <div className="space-y-2 text-sm">

                <p>
                  <strong>Versión:</strong> v1.0.0
                </p>

                <p>
                  <strong>Base de datos:</strong> PostgreSQL
                </p>

                <p>
                  <strong>Framework:</strong> Next.js 16
                </p>

                <p>
                  <strong>ORM:</strong> Prisma ORM
                </p>

                <p>
                  <strong>Interfaz:</strong> React + Tailwind CSS
                </p>

              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border">
              <h3 className="font-bold text-slate-900 mb-3">
                Información del negocio
              </h3>

              <div className="space-y-2 text-sm">

                <p>
                  <strong>Nombre:</strong>{" "}
                  {business?.name || "No configurado"}
                </p>

                <p>
                  <strong>Teléfono:</strong>{" "}
                  {business?.phone || "-"}
                </p>

                <p>
                  <strong>Correo:</strong>{" "}
                  {business?.email || "-"}
                </p>

                <p>
                  <strong>NIT:</strong>{" "}
                  {business?.nit || "-"}
                </p>

                <p>
                  <strong>Moneda:</strong>{" "}
                  {business?.currency || "GTQ"}
                </p>

              </div>
            </div>

          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">

            <h3 className="font-bold text-blue-900 mb-3">
              Desarrollador
            </h3>

            <p className="text-blue-800">
              <strong>Josué André López Díaz</strong>
            </p>

            <p className="text-blue-700 mt-2">
              Ingeniería en Sistemas • ControlStock Pro
            </p>

          </div>

          <div className="text-center text-sm text-slate-500 border-t pt-6">

            © 2026 ControlStock Pro

            <br />

            Todos los derechos reservados.

          </div>

        </section>

      </div>
    </main>
  );
}