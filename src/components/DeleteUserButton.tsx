"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import Swal from "sweetalert2";

type Props = {
  userId: number;
  userName: string;
  disabled?: boolean;
};

export default function DeleteUserButton({
  userId,
  userName,
  disabled = false,
}: Props) {
  const router = useRouter();

  async function handleDelete() {
    if (disabled) {
      return;
    }

    const confirmation =
      await Swal.fire({
        title: "¿Eliminar usuario?",
        html: `
          Estás a punto de eliminar la cuenta de
          <strong>${userName}</strong>.<br><br>
          Esta acción no se puede deshacer.
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        confirmButtonColor: "#dc2626",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/usuarios/${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        await Swal.fire({
          title:
            "No se pudo eliminar",
          text:
            data.error ||
            "Ocurrió un error.",
          icon: "error",
          confirmButtonText: "Aceptar",
        });

        return;
      }

      await Swal.fire({
        title: "Usuario eliminado",
        text: `${userName} fue eliminado correctamente.`,
        icon: "success",
        confirmButtonText: "Aceptar",
        timer: 1800,
        timerProgressBar: true,
      });

      router.refresh();
    } catch {
      await Swal.fire({
        title: "Error",
        text:
          "No fue posible eliminar el usuario.",
        icon: "error",
        confirmButtonText: "Aceptar",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={disabled}
      title={
        disabled
          ? "No puedes eliminar tu propia cuenta"
          : "Eliminar usuario"
      }
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
        disabled
          ? "cursor-not-allowed bg-slate-300"
          : "bg-red-500 hover:bg-red-600"
      }`}
    >
      <Trash2 size={13} />
      Eliminar
    </button>
  );
}