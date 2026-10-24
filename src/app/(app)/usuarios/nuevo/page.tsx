import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import NewUserForm from "@/components/users/NewUserForm";

export default async function NuevoUsuarioPage() {
  const auth = await requireRole([
    "ADMIN",
  ]);

  if (!auth.ok) {
    redirect("/dashboard");
  }

  return <NewUserForm />;
}