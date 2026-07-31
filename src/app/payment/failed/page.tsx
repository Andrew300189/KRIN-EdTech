import { PaymentStatusPage } from "@/modules/payments/components/payment-status-page";

export default function PaymentFailedPage() {
  return <PaymentStatusPage state="failed" />;
}
