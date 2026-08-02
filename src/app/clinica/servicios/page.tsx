import type { Metadata } from "next";

import { ServicesWorkspace } from "@/modules/servicios";

export const metadata: Metadata = {
  title: "Servicios y tarifas",
};

export default function ServicesPage() {
  return <ServicesWorkspace />;
}

