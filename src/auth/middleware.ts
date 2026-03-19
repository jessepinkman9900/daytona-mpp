/**
 * Authentication middleware for MPP payment-gated routes.
 *
 * Uses Tempo session-based payments (pay-as-you-go):
 * - First request opens a payment channel on-chain
 * - Subsequent requests use cheap offchain vouchers
 * - Channel closes to settle final balance
 */

import { Context, Next } from "hono";
import { payment } from "mppx/hono";
import { Mppx, tempo } from "mppx/server";
import { createClient, http } from "viem";
import { tempo as tempoMainnet, tempoModerato } from "viem/chains";
import type { AppContext, Env } from "../env";

/**
 * Creates middleware for a protected route using Tempo session payments.
 * Sessions use payment channels: the first request opens a channel on-chain,
 * and subsequent requests send offchain vouchers (no per-request gas cost).
 *
 * @param amount - Per-request payment amount string (e.g. "0.001")
 * @param unitType - Unit being charged for (e.g. "sandbox-create", "api-request")
 */
export function createProtectedRoute(amount: string, unitType: string) {
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

    return await payment(mppx.session, { amount, unitType })(c, next);
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
