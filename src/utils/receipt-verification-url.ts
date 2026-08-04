const RECEIPT_VERIFICATION_ROUTE = "/verificar-recibo";

export function getReceiptVerificationPath(receiptId: string): string {
  return `${RECEIPT_VERIFICATION_ROUTE}/${encodeURIComponent(receiptId)}`;
}

export function getReceiptVerificationUrl(receiptId: string): string {
  const path = getReceiptVerificationPath(receiptId);

  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}
