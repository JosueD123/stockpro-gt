"use client";

import Swal from "sweetalert2";

type Props = {
  title?: string;
  text?: string;
  disabled?: boolean;
};

export default function ConfirmDeleteButton({
  title = "¿Desea eliminar este registro?",
  text = "Esta acción no se puede deshacer.",
  disabled = false,
}: Props) {
  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.closest("form");

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

    if (result.isConfirmed) {
      form?.requestSubmit();
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Eliminar
    </button>
  );
}