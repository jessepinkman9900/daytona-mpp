/**
 * OpenAPI 3.1.0 spec for the cf-sandbox-mpp proxy.
 * Reflects the full Daytona sandbox API with payment info.
 */

import type { Context } from "hono";
import type { AppContext } from "./env";

const ID_PARAM = { name: "id", in: "path" as const, required: true, schema: { type: "string" as const, description: "Sandbox ID or name" } };
const SESSION_ID_PARAM = { name: "sessionId", in: "path" as const, required: true, schema: { type: "string" as const } };
const PORT_PARAM = { name: "port", in: "path" as const, required: true, schema: { type: "integer" as const } };
const INTERVAL_PARAM = { name: "interval", in: "path" as const, required: true, schema: { type: "integer" as const, description: "Interval in minutes (0 to disable)" } };
const TOKEN_PARAM = { name: "token", in: "path" as const, required: true, schema: { type: "string" as const } };
const PAYMENT_402 = { "402": { description: "Payment Required" } } as const;

function paymentInfo(price: string) {
  return {
    pricingMode: "fixed" as const,
    price,
    protocols: ["mpp"] as const,
    authMode: "paid" as const,
  };
}

const FREE_AUTH = { "x-payment-info": { authMode: "none" as const } };

function paidOp(
  operationId: string,
  summary: string,
  price: string,
  opts?: { tags?: string[]; params?: object[]; requestBody?: object },
) {
  return {
    operationId,
    summary,
    tags: opts?.tags ?? ["Sandboxes"],
    "x-payment-info": paymentInfo(price),
    ...(opts?.params ? { parameters: opts.params } : {}),
    ...(opts?.requestBody ? { requestBody: opts.requestBody } : {}),
    responses: {
      "200": { description: "Success" },
      ...PAYMENT_402,
    },
  };
}

export function buildOpenApiSpec(c: Context<AppContext>) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Sandbox API",
      version: "2.0.0",
      description:
        "MPP payment-gated passthrough proxy for the Daytona sandbox API. " +
        "All endpoints except public ones require a USDC payment via the MPP protocol. " +
        "Request bodies and query parameters are forwarded as-is to Daytona.",
      guidance:
        "This API proxies the full Daytona sandbox API with per-request payment gating. " +
        "POST /sandbox to create a sandbox (pass Daytona's CreateSandbox schema directly). " +
        "Use GET /sandbox to list, GET /sandbox/{id} to inspect, POST /sandbox/{id}/start or /stop to control lifecycle. " +
        "Toolbox endpoints under /sandbox/{id}/toolbox/... let you execute commands, manage files, and perform git operations. " +
        "All paid endpoints return 402 if payment is missing. The /openapi.json, /__mpp/health, and /__mpp/config endpoints are free.",
    },
    "x-discovery": {
      ownershipProofs: [],
    },
    servers: [{ url: new URL(c.req.url).origin }],
    paths: {
      // ── Public ────────────────────────────────────────────────────────
      "/openapi.json": {
        get: {
          operationId: "getOpenApiSpec",
          summary: "OpenAPI specification",
          tags: ["Public"],
          ...FREE_AUTH,
          responses: { "200": { description: "This document" } },
        },
      },
      "/__mpp/health": {
        get: {
          operationId: "getHealth",
          summary: "Health check",
          tags: ["Public"],
          ...FREE_AUTH,
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      proxy: { type: "string" },
                      paymentMethod: { type: "string" },
                      upstream: { type: "string" },
                      timestamp: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/__mpp/config": {
        get: {
          operationId: "getConfig",
          summary: "Proxy payment configuration",
          tags: ["Public"],
          ...FREE_AUTH,
          responses: { "200": { description: "Payment configuration" } },
        },
      },

      // ── Sandbox lifecycle ─────────────────────────────────────────────
      "/sandbox": {
        get: paidOp("listSandboxes", "List sandboxes", "0.000100", {
          params: [
            { name: "verbose", in: "query", schema: { type: "boolean" } },
            { name: "labels", in: "query", schema: { type: "string", description: "JSON-encoded label filter" } },
          ],
        }),
        post: paidOp("createSandbox", "Create a sandbox", "0.010000", {
          requestBody: {
            required: false,
            description: "Daytona CreateSandbox schema — passed through as-is. See https://www.daytona.io/docs/en/tools/api/",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "All fields are optional. Daytona uses sensible defaults.",
                  properties: {
                    name: { type: "string" },
                    snapshot: { type: "string", description: "Snapshot image reference" },
                    region: { type: "string" },
                    labels: { type: "object", additionalProperties: { type: "string" } },
                    autoStopInterval: { type: "integer", description: "Minutes before auto-stop" },
                    autoArchiveInterval: { type: "integer", description: "Minutes before auto-archive" },
                    autoDeleteInterval: { type: "integer", description: "Minutes before auto-delete" },
                    env: { type: "object", additionalProperties: { type: "string" } },
                    public: { type: "boolean" },
                  },
                },
              },
            },
          },
        }),
      },
      "/sandbox/paginated": {
        get: paidOp("listSandboxesPaginated", "List sandboxes (paginated)", "0.000100"),
      },
      "/sandbox/ssh-access/validate": {
        get: paidOp("validateSshAccess", "Validate SSH access token", "0.000100", {
          params: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
        }),
      },
      "/sandbox/{id}": {
        get: paidOp("getSandbox", "Get sandbox details", "0.000100", {
          params: [ID_PARAM, { name: "verbose", in: "query", schema: { type: "boolean" } }],
        }),
        delete: paidOp("deleteSandbox", "Delete a sandbox", "0.001000", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/start": {
        post: paidOp("startSandbox", "Start a sandbox", "0.001000", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/stop": {
        post: paidOp("stopSandbox", "Stop a sandbox", "0.001000", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/archive": {
        post: paidOp("archiveSandbox", "Archive a sandbox", "0.001000", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/resize": {
        post: paidOp("resizeSandbox", "Resize a sandbox", "0.002000", {
          params: [ID_PARAM],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cpu: { type: "number" },
                    memory: { type: "number", description: "GiB" },
                    disk: { type: "number", description: "GiB" },
                  },
                },
              },
            },
          },
        }),
      },
      "/sandbox/{id}/backup": {
        post: paidOp("backupSandbox", "Create sandbox backup", "0.001000", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/recover": {
        post: paidOp("recoverSandbox", "Recover sandbox from error state", "0.001000", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/labels": {
        put: paidOp("updateLabels", "Update sandbox labels", "0.000100", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/public/{isPublic}": {
        post: paidOp("setPublicStatus", "Set sandbox public status", "0.000100", {
          params: [ID_PARAM, { name: "isPublic", in: "path", required: true, schema: { type: "boolean" } }],
        }),
      },
      "/sandbox/{id}/autostop/{interval}": {
        post: paidOp("setAutoStop", "Set auto-stop interval", "0.000100", {
          params: [ID_PARAM, INTERVAL_PARAM],
        }),
      },
      "/sandbox/{id}/autoarchive/{interval}": {
        post: paidOp("setAutoArchive", "Set auto-archive interval", "0.000100", {
          params: [ID_PARAM, INTERVAL_PARAM],
        }),
      },
      "/sandbox/{id}/autodelete/{interval}": {
        post: paidOp("setAutoDelete", "Set auto-delete interval", "0.000100", {
          params: [ID_PARAM, INTERVAL_PARAM],
        }),
      },

      // ── SSH access ──────────────────────────────────────────────────────
      "/sandbox/{id}/ssh-access": {
        post: paidOp("createSshAccess", "Create SSH access token", "0.001000", {
          params: [ID_PARAM, { name: "expiresInMinutes", in: "query", schema: { type: "integer", default: 60 } }],
        }),
        delete: paidOp("revokeSshAccess", "Revoke SSH access", "0.000100", {
          params: [ID_PARAM, { name: "token", in: "query", schema: { type: "string" } }],
        }),
      },

      // ── URLs & logs ─────────────────────────────────────────────────────
      "/sandbox/{id}/toolbox-proxy-url": {
        get: paidOp("getToolboxProxyUrl", "Get toolbox proxy URL", "0.000100", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/build-logs-url": {
        get: paidOp("getBuildLogsUrl", "Get build logs URL", "0.000100", { params: [ID_PARAM] }),
      },
      "/sandbox/{id}/ports/{port}/preview-url": {
        get: paidOp("getPortPreviewUrl", "Get port preview URL", "0.000100", {
          params: [ID_PARAM, PORT_PARAM],
        }),
      },
      "/sandbox/{id}/ports/{port}/signed-preview-url": {
        get: paidOp("getSignedPreviewUrl", "Get signed port preview URL", "0.000100", {
          params: [ID_PARAM, PORT_PARAM, { name: "expiresInSeconds", in: "query", schema: { type: "integer", default: 60 } }],
        }),
      },
      "/sandbox/{id}/ports/{port}/signed-preview-url/{token}/expire": {
        post: paidOp("expireSignedPreviewUrl", "Expire signed preview URL token", "0.000100", {
          params: [ID_PARAM, PORT_PARAM, TOKEN_PARAM],
        }),
      },

      // ── Toolbox: Process ────────────────────────────────────────────────
      "/sandbox/{id}/toolbox/process/execute": {
        post: paidOp("executeProcess", "Execute a command in sandbox", "0.000100", {
          tags: ["Toolbox – Process"],
          params: [ID_PARAM],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    command: { type: "string" },
                    cwd: { type: "string" },
                  },
                  required: ["command"],
                },
              },
            },
          },
        }),
      },
      "/sandbox/{id}/toolbox/process/sessions": {
        get: paidOp("listProcessSessions", "List process sessions", "0.000100", { tags: ["Toolbox – Process"], params: [ID_PARAM] }),
        post: paidOp("createProcessSession", "Create process session", "0.000100", { tags: ["Toolbox – Process"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/process/sessions/{sessionId}": {
        delete: paidOp("deleteProcessSession", "Kill a process session", "0.000100", {
          tags: ["Toolbox – Process"],
          params: [ID_PARAM, SESSION_ID_PARAM],
        }),
      },
      "/sandbox/{id}/toolbox/process/sessions/{sessionId}/exec": {
        post: paidOp("execInSession", "Execute command in a session", "0.000100", {
          tags: ["Toolbox – Process"],
          params: [ID_PARAM, SESSION_ID_PARAM],
        }),
      },

      // ── Toolbox: Files ──────────────────────────────────────────────────
      "/sandbox/{id}/toolbox/files": {
        get: paidOp("listFiles", "List files", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
        delete: paidOp("deleteFile", "Delete a file", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/upload": {
        post: paidOp("uploadFile", "Upload a file", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/bulk-upload": {
        post: paidOp("bulkUploadFiles", "Upload multiple files", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/download": {
        get: paidOp("downloadFile", "Download a file", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/bulk-download": {
        post: paidOp("bulkDownloadFiles", "Download multiple files", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/folder": {
        post: paidOp("createFolder", "Create a folder", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/move": {
        post: paidOp("moveFile", "Move or rename a file", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/info": {
        get: paidOp("getFileInfo", "Get file info", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/search": {
        get: paidOp("searchFiles", "Search files by name", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/find": {
        get: paidOp("findInFiles", "Search file contents", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/replace": {
        post: paidOp("replaceInFiles", "Find and replace in files", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/files/permissions": {
        post: paidOp("setFilePermissions", "Set file permissions", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/project-dir": {
        get: paidOp("getProjectDir", "Get project directory", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/user-home-dir": {
        get: paidOp("getUserHomeDir", "Get user home directory", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/work-dir": {
        get: paidOp("getWorkDir", "Get work directory", "0.000100", { tags: ["Toolbox – Files"], params: [ID_PARAM] }),
      },

      // ── Toolbox: Git ────────────────────────────────────────────────────
      "/sandbox/{id}/toolbox/git/clone": {
        post: paidOp("gitClone", "Clone a git repository", "0.001000", {
          tags: ["Toolbox – Git"],
          params: [ID_PARAM],
        }),
      },
      "/sandbox/{id}/toolbox/git/add": {
        post: paidOp("gitAdd", "Stage files for commit", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/git/commit": {
        post: paidOp("gitCommit", "Commit changes", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/git/push": {
        post: paidOp("gitPush", "Push changes", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/git/pull": {
        post: paidOp("gitPull", "Pull changes", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/git/branches": {
        get: paidOp("listBranches", "List git branches", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
        post: paidOp("createBranch", "Create a git branch", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
        delete: paidOp("deleteBranch", "Delete a git branch", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
      },
      "/sandbox/{id}/toolbox/git/history": {
        get: paidOp("gitHistory", "Get commit history", "0.000100", { tags: ["Toolbox – Git"], params: [ID_PARAM] }),
      },
    },
  };
}
