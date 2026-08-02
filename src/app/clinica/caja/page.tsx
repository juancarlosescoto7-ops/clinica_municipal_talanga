import type { Metadata } from "next";

import { GuidedOperationsWorkspace } from "@/modules/operacion-guiada";

export const metadata: Metadata = {
  title: "Operación guiada",
};

export default function CashPage() {
  return <GuidedOperationsWorkspace />;
}
