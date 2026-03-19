/**
 * cf-sandbox-mpp — Cloudflare Worker
 *
 * MPP payment-gated passthrough proxy for the Daytona sandbox API.
 * Every non-public request requires a Tempo USDC payment, then
 * forwards as-is to Daytona.
 */

import { Hono, type Context } from "hono";
import { createProtectedRoute } from "./auth/middleware";
import { findFee, applySurcharge } from "./pricing/matcher";
import { buildOpenApiSpec } from "./openapi";
import { proxyToDaytona } from "./proxy";
import type { AppContext } from "./env";

const app = new Hono<AppContext>();

// ── Public endpoints (no payment required) ────────────────────────────────

const PUBLIC_PATHS = ["/__mpp/health", "/__mpp/config", "/openapi.json"];

app.get("/__mpp/health", (c) =>
  c.json({
    status: "ok",
    proxy: "cf-sandbox-mpp",
    paymentMethod: "tempo",
    upstream: c.env.DAYTONA_API_URL,
    timestamp: Date.now(),
  }),
);

app.get("/__mpp/config", (c) =>
  c.json({
    paymentScheme: "Payment",
    paymentMethod: "tempo",
    tempoTestnet: c.env.TEMPO_TESTNET,
    payTo: c.env.PAY_TO ? `***${c.env.PAY_TO.slice(-6)}` : null,
    platformSurcharge: c.env.PLATFORM_SURCHARGE,
    upstream: c.env.DAYTONA_API_URL,
  }),
);

app.get("/openapi.json", (c) => c.json(buildOpenApiSpec(c)));

// ── Payment-gated passthrough ─────────────────────────────────────────────

app.use("*", async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  if (PUBLIC_PATHS.includes(path)) {
    return next();
  }

  if (!c.env.MPP_SECRET_KEY || !c.env.DAYTONA_API_KEY) {
    return c.json(
      { error: "Server misconfigured: required secrets not set" },
      500,
    );
  }

  const fee = findFee(method, path);
  if (!fee) {
    return c.json(
      {
        error: "Route not configured for billing",
        hint: "This HTTP method is not supported by the proxy",
      },
      404,
    );
  }

  const surcharge = parseFloat(c.env.PLATFORM_SURCHARGE || "0");
  const { amount, description } = applySurcharge(fee, surcharge);
  return handlePaidRoute(c, amount, description);
});

// ── Paid route handler ────────────────────────────────────────────────────

async function handlePaidRoute(
  c: Context<AppContext>,
  amount: string,
  description: string,
) {
  const protectedMw = createProtectedRoute(amount, description);

  const result = await protectedMw(c, async () => {});
  if (result) return result;
  if (c.res && c.res.status >= 400) return c.res;

  const upstream = await proxyToDaytona(c.req.raw, c.env);
  return buildProxiedResponse(c, upstream);
}

/**
 * Clone upstream response and forward the Payment-Receipt header.
 */
function buildProxiedResponse(c: Context<AppContext>, upstream: Response): Response {
  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: new Headers(upstream.headers),
  });

  const receipt = c.res.headers.get("Payment-Receipt");
  if (receipt) {
    response.headers.set("Payment-Receipt", receipt);
  }

  return response;
}

export default app;
