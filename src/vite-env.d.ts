/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "on" turns the paywall on. Anything else = everything free (current behaviour). */
  readonly VITE_PAYWALL?: string;
  /** Hosted checkout link (Lemon Squeezy product page) for the exam pass. */
  readonly VITE_CHECKOUT_URL?: string;
  /** Displayed price, e.g. "₪49". The real price lives in the provider dashboard. */
  readonly VITE_PASS_PRICE?: string;
  /** Days of access per purchase when the key has no expiry. */
  readonly VITE_PASS_DAYS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
