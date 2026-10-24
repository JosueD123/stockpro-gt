"use client";

import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

type DeleteButtonProps = {
  id: number;
  apiUrl: string;
  title?: string;
  text?: string;
};

export default function DeleteButton({
  id,
  apiUrl,
  title = "¿Desea eliminar este registro?",
  text = "Esta acción no se puede deshacer.",
}: DeleteButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!result.isConfirmed) return;

    const res = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      Swal.fire({
        title: "No se pudo eliminar",
        text: "El registro no pudo eliminarse. Verifique si está asociado a otros datos.",
        icon: "error",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    await Swal.fire({
      title: "Eliminado correctamente",
      text: "El registro fue eliminado del sistema.",
      icon: "success",
      confirmButtonColor: "#0f172a",
    });

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Eliminar
    </button>
  );
}