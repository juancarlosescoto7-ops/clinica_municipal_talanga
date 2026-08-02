import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const themeInitializer = `
  (() => {
    const root = document.documentElement;

    try {
      const storedTheme = localStorage.getItem("siemc-theme");
      const theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    } catch {
      root.dataset.theme = "light";
      root.style.colorScheme = "light";
    }
  })();
`;

export const metadata: Metadata = {
  title: {
    default: "SIEMC",
    template: "%s | SIEMC",
  },
  description:
    "Sistema de control operativo y financiero de la Clínica Municipal.",
  icons: {
    icon: "/brand/logo-municipalidad.svg",
    shortcut: "/brand/logo-municipalidad.svg",
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body>
        <a className="skip-link" href="#contenido-principal">
          Ir al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
