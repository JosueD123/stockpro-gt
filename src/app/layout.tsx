import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ControlStock Pro",
  description:
    "Sistema de inventario, ventas y reportes para pequeños negocios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-screen bg-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
