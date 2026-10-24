import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/session";

export type UserRole =
  | "ADMIN"
  | "SELLER"
  | "VIEWER";

export type AuthSession = {
  userId: number;
  role: UserRole;
};

const VALID_ROLES: UserRole[] = [
  "ADMIN",
  "SELLER",
  "VIEWER",
];

/*
 * ==========================================
 * OBTENER SESIÓN AUTENTICADA
 * ==========================================
 */

export async function getAuthSession(): Promise<AuthSession | null> {
  /*
   * LEER COOKIE
   */

  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      getSessionCookieName()
    )?.value;

  /*
   * VALIDAR FIRMA Y EXPIRACIÓN
   */

  const tokenSession =
    await verifySessionToken(
      token
    );

  if (!tokenSession) {
    return null;
  }

  /*
   * ==========================================
   * VERIFICAR USUARIO REAL
   * ==========================================
   *
   * No confiamos únicamente en el rol
   * guardado dentro del token.
   *
   * Consultamos el usuario actual en la BD.
   */

  const user =
    await prisma.user.findUnique({
      where: {
        id:
          tokenSession.userId,
      },

      select: {
        id: true,
        role: true,
      },
    });

  /*
   * Si el usuario fue eliminado,
   * su sesión deja de ser válida.
   */

  if (!user) {
    return null;
  }

  /*
   * VALIDAR ROL ACTUAL
   */

  const role =
    user.role as UserRole;

  if (
    !VALID_ROLES.includes(
      role
    )
  ) {
    return null;
  }

  /*
   * IMPORTANTE:
   *
   * Utilizamos el rol ACTUAL almacenado
   * en la base de datos, no el rol antiguo
   * contenido en el token.
   */

  return {
    userId:
      user.id,

    role,
  };
}

/*
 * ==========================================
 * REQUERIR AUTENTICACIÓN
 * ==========================================
 */

export async function requireAuth() {
  const session =
    await getAuthSession();

  if (!session) {
    return {
      ok: false as const,

      status: 401,

      error:
        "Debes iniciar sesión nuevamente.",
    };
  }

  return {
    ok: true as const,

    session,
  };
}

/*
 * ==========================================
 * REQUERIR ROL
 * ==========================================
 */

export async function requireRole(
  allowedRoles: UserRole[]
) {
  const auth =
    await requireAuth();

  if (!auth.ok) {
    return auth;
  }

  if (
    !allowedRoles.includes(
      auth.session.role
    )
  ) {
    return {
      ok: false as const,

      status: 403,

      error:
        "No tienes permisos para realizar esta acción.",
    };
  }

  return {
    ok: true as const,

    session:
      auth.session,
  };
}