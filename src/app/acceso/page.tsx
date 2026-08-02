import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CLINIC_ENTRY_PATH } from "@/modules/fundacion-visual";

export const metadata: Metadata = {
  title: "Acceso",
};

export default function AccessPage() {
  redirect(CLINIC_ENTRY_PATH);
}
