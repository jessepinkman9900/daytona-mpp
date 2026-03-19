/**
 * Per-request fees for all Daytona API operations proxied through this worker.
 * Amounts are in USDC, charged per request via session-based payment channels.
 *
 * Route patterns support :param segments and trailing /* wildcards.
 * More specific routes must appear before wildcards to match first.
 */

export interface Fee {
  amount: string;
  unitType: string;
  description: string;
}

export const FLAT_FEES: Record<string, Fee> = {
  // ── Sandbox creation ─────────────────────────────────────────────────────
  "POST /sandbox": {
    amount: "0.01",
    unitType: "sandbox-create",
    description: "Create a Daytona sandbox",
  },

  // ── Sandbox lifecycle ────────────────────────────────────────────────────
  "POST /sandbox/:id/start": {
    amount: "0.001",
    unitType: "sandbox-lifecycle",
    description: "Start a sandbox",
  },
  "POST /sandbox/:id/stop": {
    amount: "0.001",
    unitType: "sandbox-lifecycle",
    description: "Stop a sandbox",
  },
  "DELETE /sandbox/:id": {
    amount: "0.001",
    unitType: "sandbox-lifecycle",
    description: "Delete a sandbox",
  },
  "POST /sandbox/:id/archive": {
    amount: "0.001",
    unitType: "sandbox-lifecycle",
    description: "Archive a sandbox",
  },
  "POST /sandbox/:id/resize": {
    amount: "0.002",
    unitType: "sandbox-lifecycle",
    description: "Resize a sandbox",
  },
  "POST /sandbox/:id/backup": {
    amount: "0.001",
    unitType: "sandbox-lifecycle",
    description: "Create sandbox backup",
  },
  "POST /sandbox/:id/recover": {
    amount: "0.001",
    unitType: "sandbox-lifecycle",
    description: "Recover sandbox from error state",
  },

  // ── SSH access ───────────────────────────────────────────────────────────
  "POST /sandbox/:id/ssh-access": {
    amount: "0.001",
    unitType: "sandbox-access",
    description: "Create SSH access token",
  },
  "DELETE /sandbox/:id/ssh-access": {
    amount: "0.0001",
    unitType: "sandbox-access",
    description: "Revoke SSH access",
  },
  "GET /sandbox/ssh-access/validate": {
    amount: "0.0001",
    unitType: "sandbox-access",
    description: "Validate SSH access token",
  },

  // ── Sandbox reads ────────────────────────────────────────────────────────
  "GET /sandbox": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "List sandboxes",
  },
  "GET /sandbox/paginated": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "List sandboxes (paginated)",
  },
  "GET /sandbox/:id": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "Get sandbox details",
  },

  // ── Sandbox config ───────────────────────────────────────────────────────
  "POST /sandbox/:id/autostop/:interval": {
    amount: "0.0001",
    unitType: "sandbox-config",
    description: "Set auto-stop interval",
  },
  "POST /sandbox/:id/autoarchive/:interval": {
    amount: "0.0001",
    unitType: "sandbox-config",
    description: "Set auto-archive interval",
  },
  "POST /sandbox/:id/autodelete/:interval": {
    amount: "0.0001",
    unitType: "sandbox-config",
    description: "Set auto-delete interval",
  },
  "POST /sandbox/:id/public/:isPublic": {
    amount: "0.0001",
    unitType: "sandbox-config",
    description: "Set sandbox public status",
  },
  "PUT /sandbox/:id/labels": {
    amount: "0.0001",
    unitType: "sandbox-config",
    description: "Update sandbox labels",
  },

  // ── URLs & access ────────────────────────────────────────────────────────
  "GET /sandbox/:id/toolbox-proxy-url": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "Get toolbox proxy URL",
  },
  "GET /sandbox/:id/ports/:port/preview-url": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "Get port preview URL",
  },
  "GET /sandbox/:id/ports/:port/signed-preview-url": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "Get signed port preview URL",
  },
  "POST /sandbox/:id/ports/:port/signed-preview-url/:token/expire": {
    amount: "0.0001",
    unitType: "sandbox-config",
    description: "Expire signed preview URL token",
  },
  "GET /sandbox/:id/build-logs-url": {
    amount: "0.0001",
    unitType: "sandbox-read",
    description: "Get build logs URL",
  },

  // ── Toolbox: specific overrides (must precede wildcards) ────────────────
  "POST /sandbox/:id/toolbox/git/clone": {
    amount: "0.001",
    unitType: "toolbox-git",
    description: "Clone a git repo into sandbox",
  },

  // ── Toolbox: wildcard catch-alls ─────────────────────────────────────────
  "GET /sandbox/:id/toolbox/*": {
    amount: "0.0001",
    unitType: "toolbox-read",
    description: "Toolbox read operation",
  },
  "POST /sandbox/:id/toolbox/*": {
    amount: "0.0001",
    unitType: "toolbox-exec",
    description: "Toolbox write/execute operation",
  },
  "PUT /sandbox/:id/toolbox/*": {
    amount: "0.0001",
    unitType: "toolbox-exec",
    description: "Toolbox update operation",
  },
  "DELETE /sandbox/:id/toolbox/*": {
    amount: "0.0001",
    unitType: "toolbox-exec",
    description: "Toolbox delete operation",
  },
};

/**
 * Default fees by HTTP method, used when no specific route matches.
 * This ensures any new Daytona endpoint works without proxy changes.
 */
export const DEFAULT_FEES: Record<string, Fee> = {
  GET: { amount: "0.0001", unitType: "api-read", description: "API read operation" },
  POST: { amount: "0.001", unitType: "api-write", description: "API write operation" },
  PUT: { amount: "0.001", unitType: "api-write", description: "API update operation" },
  PATCH: { amount: "0.001", unitType: "api-write", description: "API update operation" },
  DELETE: { amount: "0.001", unitType: "api-write", description: "API delete operation" },
};
