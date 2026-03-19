/**
 * Authentication middleware for MPP payment-gated routes.
 */

import { Context, Next } from "hono";
import { payment } from "mppx/hono";
import { Mppx, tempo } from "mppx/server";
import { createClient, http } from "viem";
import { tempo as tempoMainnet, tempoModerato } from "viem/chains";
import type { AppContext, Env } from "../env";

/**
 * Creates middleware for a protected route that requires payment via Tempo.
 * Tempo handles idempotency — payment proofs are single-use and cannot be replayed.
 *
 * @param amount - Payment amount string (e.g. "0.01")
 * @param description - Human-readable payment description
 */
export function createProtectedRoute(amount: string, description: string) {
  return async (c: Context<AppContext>, next: Next) => {
    const mppx = Mppx.create({
      methods: [
        tempo({
          currency: c.env.PAYMENT_CURRENCY,
          recipient: c.env.PAY_TO,
          testnet: c.env.TEMPO_TESTNET,
          ...(c.env.TEMPO_RPC_URL
            ? { getClient: createTempoClientResolver(c.env) }
            : {}),
        }),
      ],
      realm: new URL(c.req.url).host,
      secretKey: c.env.MPP_SECRET_KEY,
    });

    return await payment(mppx.charge, { amount, description })(c, next);
  };
}

function createTempoClientResolver(env: Env) {
  return ({ chainId }: { chainId?: number }) => {
    const chain = env.TEMPO_TESTNET
      ? tempoModerato
      : { ...tempoMainnet, experimental_preconfirmationTime: 500 };

    return createClient({
      chain: { ...chain, id: chainId ?? chain.id },
      transport: http(env.TEMPO_RPC_URL),
    });
  };
}
