/**
 * Environment bindings and app context types.
 */

export interface Env {
  // Daytona
  DAYTONA_API_URL: string;
  DAYTONA_API_KEY: string;

  // MPP / Tempo payment
  PAY_TO: `0x${string}`;
  PAYMENT_CURRENCY: `0x${string}`;
  TEMPO_TESTNET: boolean;
  MPP_SECRET_KEY: string;
  TEMPO_RPC_URL?: string;

  // Platform billing
  /** Surcharge as a decimal: 0.10 = 10% on top of base fee */
  PLATFORM_SURCHARGE: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: Record<string, never>;
}
