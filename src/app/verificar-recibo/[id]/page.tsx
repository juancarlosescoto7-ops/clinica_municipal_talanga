import type { Metadata } from "next";

import { ReceiptVerification } from "@/modules/reimpresion";

export const metadata: Metadata = {
  title: "Verificar recibo",
  description: "Validación pública de un recibo emitido por SIEMC.",
  robots: {
    index: false,
    follow: false,
  },
};

interface ReceiptVerificationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptVerificationPage({
  params,
}: ReceiptVerificationPageProps) {
  const { id } = await params;
  return <ReceiptVerification receiptId={id} />;
}
