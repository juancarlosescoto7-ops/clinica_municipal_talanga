import { redirect } from "next/navigation";

import { CLINIC_ENTRY_PATH } from "@/modules/fundacion-visual";

export default function ClinicHomePage() {
  redirect(CLINIC_ENTRY_PATH);
}
