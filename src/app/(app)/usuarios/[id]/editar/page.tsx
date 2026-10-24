import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import EditUserForm from "@/components/users/EditUserForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarUsuarioPage({
  params,
}: Props) {
  const auth = await requireRole([
    "ADMIN",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const userId = Number(id);

  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    redirect("/usuarios");
  }

  return (
    <EditUserForm
      userId={userId}
    />
  );
}