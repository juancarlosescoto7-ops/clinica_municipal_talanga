import type { Metadata } from "next";

import { ReportsWorkspace } from "@/modules/reportes";

export const metadata: Metadata = {
  title: "Reportes",
};

export default function ReportsPage() {
  return <ReportsWorkspace />;
}
