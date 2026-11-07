/**
 * Embedded Stripe Checkout (Stripe phase §5, §18).
 *
 * Payment happens INSIDE the app: Stripe's embedded Checkout iframe is
 * mounted in a native dialog — the user is never redirected to
 * checkout.stripe.com. The browser only touches Stripe's client-side
 * components; card data never transits our backend.
 */
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { Dialog } from "@/components/ui/Dialog";
import { env, isBillingEnabled } from "@/lib/config/env";

/** Stripe instance for the lifetime of the app (publishable key only). */
const stripePromise = isBillingEnabled()
  ? loadStripe(env.stripePublishableKey as string)
  : null;

export interface EmbeddedCheckoutModalProps {
  open: boolean;
  clientSecret: string;
  /** Fired by Stripe when the Checkout Session completes successfully
   * (payment failures are shown by Stripe INSIDE the embedded form). */
  onComplete: () => void;
  onClose: () => void;
}

export function EmbeddedCheckoutModal({
  open,
  clientSecret,
  onComplete,
  onClose,
}: EmbeddedCheckoutModalProps) {
  if (!stripePromise) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      title="Subscribe"
      description="Secure payment processed by Stripe. You won't leave the Academy."
    >
      {open ? (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{
            clientSecret,
            onComplete,
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      ) : null}
    </Dialog>
  );
}
