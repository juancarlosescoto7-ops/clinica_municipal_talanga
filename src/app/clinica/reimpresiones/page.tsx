import type { Metadata } from "next";

import { ReceiptReprintWorkspace } from "@/modules/reimpresion";

export const metadata: Metadata = {
  title: "Reimpresión de recibos",
};

export default function ReceiptReprintsPage() {
  return <ReceiptReprintWorkspace />;
}
