// src/proxy.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/session";

type UserRole =
  | "ADMIN"
  | "SELLER"
  | "VIEWER";


const VALID_ROLES: UserRole[] = [
  "ADMIN",
  "SELLER",
  "VIEWER",
];


const protectedRoutes = [
  "/dashboard",
  "/productos",
  "/compras",
  "/entradas",
  "/ajustes",
  "/kardex",
  "/categorias",
  "/proveedores",
  "/clientes",
  "/ventas",
  "/reportes",
  "/usuarios",
  "/configuracion",
  "/acerca-de",
  "/cuentas-por-cobrar",
];


const rolePermissions: Record<UserRole, string[]> = {

  ADMIN: [
    "/dashboard",
    "/productos",
    "/compras",
    "/entradas",
    "/ajustes",
    "/kardex",
    "/categorias",
    "/proveedores",
    "/clientes",
    "/ventas",
    "/reportes",
    "/usuarios",
    "/configuracion",
    "/acerca-de",
    "/cuentas-por-cobrar",
  ],


  SELLER: [
    "/dashboard",
    "/productos",
    "/kardex",
    "/clientes",
    "/ventas",
    "/cuentas-por-cobrar",
    "/acerca-de",
  ],


  VIEWER: [
  "/dashboard",
  "/productos",
  "/kardex",
  "/reportes",
  "/acerca-de",
],

};


function pathnameMatchesRoute(
  pathname: string,
  route: string
) {
  return (
    pathname === route ||
    pathname.startsWith(
      `${route}/`
    )
  );
}


function isRestrictedProductRoute(
  pathname: string
) {

  if (
    pathname ===
    "/productos/nuevo"
  ) {
    return true;
  }


  if (
    pathname.startsWith("/productos/") &&
    pathname.endsWith("/editar")
  ) {
    return true;
  }


  return false;
}



export async function proxy(
  req: NextRequest
) {

  const { pathname } =
    req.nextUrl;


  const token =
    req.cookies.get(
      getSessionCookieName()
    )?.value;


  const session =
    await verifySessionToken(token);



  if (pathname === "/") {

    if (session) {

      return NextResponse.redirect(
        new URL(
          "/dashboard",
          req.url
        )
      );

    }

    return NextResponse.next();

  }



  const isProtected =
    protectedRoutes.some(
      (route) =>
        pathnameMatchesRoute(
          pathname,
          route
        )
    );


  if (!isProtected) {

    return NextResponse.next();

  }



  if (!session) {

    const response =
      NextResponse.redirect(
        new URL(
          "/",
          req.url
        )
      );


    response.cookies.delete(
      getSessionCookieName()
    );


    return response;

  }



  const role =
    session.role as UserRole;



  if (
    !VALID_ROLES.includes(role)
  ) {

    const response =
      NextResponse.redirect(
        new URL(
          "/",
          req.url
        )
      );


    response.cookies.delete(
      getSessionCookieName()
    );


    return response;

  }



  if (
    role !== "ADMIN" &&
    isRestrictedProductRoute(pathname)
  ) {

    return NextResponse.redirect(
      new URL(
        "/productos",
        req.url
      )
    );

  }



  const allowedRoutes =
    rolePermissions[role];


  const hasPermission =
    allowedRoutes.some(
      (route) =>
        pathnameMatchesRoute(
          pathname,
          route
        )
    );


  if (!hasPermission) {

    return NextResponse.redirect(
      new URL(
        "/dashboard",
        req.url
      )
    );

  }



  return NextResponse.next();

}



export const config = {

  matcher: [
    "/",

    "/dashboard/:path*",

    "/productos/:path*",

    "/compras/:path*",

    "/entradas/:path*",

    "/ajustes/:path*",

    "/kardex/:path*",

    "/categorias/:path*",

    "/proveedores/:path*",

    "/clientes/:path*",

    "/ventas/:path*",

    "/reportes/:path*",

    "/usuarios/:path*",

    "/configuracion/:path*",

    "/acerca-de/:path*",

    "/cuentas-por-cobrar/:path*",
  ],

};