/**
 * Proxy forwarder to Daytona API.
 *
 * Strips the client's Authorization header (MPP Payment credential)
 * and injects the server-side Daytona API key. Rewrites Location
 * headers on redirects back to the proxy's own origin.
 */

import type { Env } from "./env";

export async function proxyToDaytona(
  request: Request,
  env: Env,
): Promise<Response> {
  const targetUrl = new URL(env.DAYTONA_API_URL);
  const proxiedUrl = new URL(request.url);
  const { hostname: originalHostname, protocol: originalProtocol, port: originalPort } = proxiedUrl;
  proxiedUrl.hostname = targetUrl.hostname;
  proxiedUrl.protocol = targetUrl.protocol;
  proxiedUrl.port = targetUrl.port;

  // Daytona serves toolbox endpoints under /toolbox/{id}/toolbox/...
  // rather than /sandbox/{id}/toolbox/... — rewrite before forwarding.
  const toolboxRe = /^\/sandbox\/([^/]+)\/toolbox\/(.*)/;
  const toolboxMatch = proxiedUrl.pathname.match(toolboxRe);
  if (toolboxMatch) {
    proxiedUrl.pathname = `/toolbox/${toolboxMatch[1]}/toolbox/${toolboxMatch[2]}`;
  }

  // Prepend the target's pathname if it has one (e.g. /api)
  if (targetUrl.pathname !== "/") {
    proxiedUrl.pathname = targetUrl.pathname + proxiedUrl.pathname;
  }

  const headers = new Headers(request.headers);
  headers.delete("Authorization");
  headers.set("Authorization", `Bearer ${env.DAYTONA_API_KEY}`);
  headers.set("Host", targetUrl.hostname);
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(proxiedUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });

  // Rewrite Location headers on redirects back to proxy origin
  const location = response.headers.get("Location");
  if (location) {
    try {
      const locationUrl = new URL(location, proxiedUrl);
      locationUrl.hostname = originalHostname;
      locationUrl.protocol = originalProtocol;
      locationUrl.port = originalPort;

      const newHeaders = new Headers(response.headers);
      newHeaders.set("Location", locationUrl.toString());

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch {
      // If URL parsing fails, return as-is
    }
  }

  return response;
}
