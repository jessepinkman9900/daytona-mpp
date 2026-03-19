/**
 * llms.txt — Machine-readable API documentation for AI agents.
 * Served at /llms.txt as plain markdown.
 */

import type { Context } from "hono";
import type { AppContext } from "./env";

export function buildLlmsTxt(c: Context<AppContext>): string {
  const origin = new URL(c.req.url).origin;

  return `# Sandbox API (Daytona)

> Payment-gated sandbox API proxy. Create, manage, and interact with cloud dev sandboxes. All paid endpoints require USDC payment via the Tempo CLI.

## Base URL

${origin}

## Authentication

All endpoints (except those marked FREE) require a per-request USDC micropayment via the [Tempo CLI](https://tempo.build). Use \`tempo request\` instead of \`curl\`.

\`\`\`bash
# Install & login
tempo wallet login
# Make a request (payment is auto-negotiated)
tempo request ${origin}/sandbox
\`\`\`

## Free Endpoints

- \`GET /openapi.json\` — OpenAPI 3.1.0 spec
- \`GET /__mpp/health\` — Health check
- \`GET /__mpp/config\` — Payment configuration
- \`GET /llms.txt\` — This document

## Sandbox Lifecycle

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| GET | /sandbox | $0.0001 | List all sandboxes |
| GET | /sandbox/paginated | $0.0001 | List sandboxes (paginated) |
| POST | /sandbox | $0.01 | Create a sandbox |
| GET | /sandbox/{id} | $0.0001 | Get sandbox details |
| DELETE | /sandbox/{id} | $0.001 | Delete a sandbox |
| POST | /sandbox/{id}/start | $0.001 | Start a sandbox |
| POST | /sandbox/{id}/stop | $0.001 | Stop a sandbox |
| POST | /sandbox/{id}/archive | $0.001 | Archive a sandbox |
| POST | /sandbox/{id}/resize | $0.002 | Resize (cpu/memory/disk) |
| POST | /sandbox/{id}/backup | $0.001 | Create backup |
| POST | /sandbox/{id}/recover | $0.001 | Recover from error state |

## Sandbox Configuration

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| POST | /sandbox/{id}/autostop/{minutes} | $0.0001 | Set auto-stop interval (0 to disable) |
| POST | /sandbox/{id}/autoarchive/{minutes} | $0.0001 | Set auto-archive interval |
| POST | /sandbox/{id}/autodelete/{minutes} | $0.0001 | Set auto-delete interval |
| POST | /sandbox/{id}/public/{bool} | $0.0001 | Set public visibility |
| PUT | /sandbox/{id}/labels | $0.0001 | Update labels |

## SSH Access

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| POST | /sandbox/{id}/ssh-access | $0.001 | Create SSH access token |
| DELETE | /sandbox/{id}/ssh-access | $0.0001 | Revoke SSH access |
| GET | /sandbox/ssh-access/validate?token=TOKEN | $0.0001 | Validate SSH token |

## URLs & Ports

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| GET | /sandbox/{id}/toolbox-proxy-url | $0.0001 | Get toolbox proxy URL |
| GET | /sandbox/{id}/build-logs-url | $0.0001 | Get build logs URL |
| GET | /sandbox/{id}/ports/{port}/preview-url | $0.0001 | Get port preview URL |
| GET | /sandbox/{id}/ports/{port}/signed-preview-url | $0.0001 | Get signed preview URL |
| POST | /sandbox/{id}/ports/{port}/signed-preview-url/{token}/expire | $0.0001 | Expire signed URL |

## Toolbox: Process Execution

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| POST | /sandbox/{id}/toolbox/process/execute | $0.0001 | Execute a command |
| GET | /sandbox/{id}/toolbox/process/sessions | $0.0001 | List process sessions |
| POST | /sandbox/{id}/toolbox/process/sessions | $0.0001 | Create process session |
| POST | /sandbox/{id}/toolbox/process/sessions/{sessionId}/exec | $0.0001 | Execute in session |
| DELETE | /sandbox/{id}/toolbox/process/sessions/{sessionId} | $0.0001 | Kill session |

## Toolbox: File Operations

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| GET | /sandbox/{id}/toolbox/files?path=PATH | $0.0001 | List files |
| DELETE | /sandbox/{id}/toolbox/files?path=PATH | $0.0001 | Delete a file |
| POST | /sandbox/{id}/toolbox/files/upload | $0.0001 | Upload a file |
| POST | /sandbox/{id}/toolbox/files/bulk-upload | $0.0001 | Upload multiple files |
| GET | /sandbox/{id}/toolbox/files/download?path=PATH | $0.0001 | Download a file |
| POST | /sandbox/{id}/toolbox/files/bulk-download | $0.0001 | Download multiple files |
| POST | /sandbox/{id}/toolbox/files/folder?path=PATH&mode=755 | $0.0001 | Create a folder |
| POST | /sandbox/{id}/toolbox/files/move | $0.0001 | Move/rename a file |
| GET | /sandbox/{id}/toolbox/files/info?path=PATH | $0.0001 | Get file metadata |
| GET | /sandbox/{id}/toolbox/files/search?path=PATH&pattern=PATTERN | $0.0001 | Search files by name |
| GET | /sandbox/{id}/toolbox/files/find | $0.0001 | Search file contents |
| POST | /sandbox/{id}/toolbox/files/replace | $0.0001 | Find and replace in files |
| POST | /sandbox/{id}/toolbox/files/permissions | $0.0001 | Set file permissions |
| GET | /sandbox/{id}/toolbox/project-dir | $0.0001 | Get project directory |
| GET | /sandbox/{id}/toolbox/user-home-dir | $0.0001 | Get user home directory |
| GET | /sandbox/{id}/toolbox/work-dir | $0.0001 | Get work directory |

## Toolbox: Git Operations

| Method | Path | Cost | Description |
|--------|------|------|-------------|
| POST | /sandbox/{id}/toolbox/git/clone | $0.001 | Clone a repository |
| POST | /sandbox/{id}/toolbox/git/add | $0.0001 | Stage files |
| POST | /sandbox/{id}/toolbox/git/commit | $0.0001 | Commit changes |
| POST | /sandbox/{id}/toolbox/git/push | $0.0001 | Push changes |
| POST | /sandbox/{id}/toolbox/git/pull | $0.0001 | Pull changes |
| GET | /sandbox/{id}/toolbox/git/branches | $0.0001 | List branches |
| POST | /sandbox/{id}/toolbox/git/branches | $0.0001 | Create branch |
| DELETE | /sandbox/{id}/toolbox/git/branches | $0.0001 | Delete branch |
| GET | /sandbox/{id}/toolbox/git/history | $0.0001 | Get commit history |

## Quick Start

\`\`\`bash
# 1. Create a sandbox
tempo request -X POST --json '{}' ${origin}/sandbox
# Response: {"id": "abc123", "state": "started", ...}

# 2. Execute a command
tempo request -X POST \\
  --json '{"command": "python3 -c \\"print(42)\\""}' \\
  ${origin}/sandbox/abc123/toolbox/process/execute

# 3. Upload a file (content is base64-encoded)
tempo request -X POST \\
  --json '{"path": "/home/daytona/hello.py", "content": "cHJpbnQoJ2hlbGxvJyk="}' \\
  ${origin}/sandbox/abc123/toolbox/files/upload

# 4. List files
tempo request "${origin}/sandbox/abc123/toolbox/files?path=/home/daytona"

# 5. Clone a repo
tempo request -X POST \\
  --json '{"url": "https://github.com/octocat/Hello-World.git", "path": "/home/daytona/hello-world"}' \\
  ${origin}/sandbox/abc123/toolbox/git/clone

# 6. Stop and delete when done
tempo request -X POST ${origin}/sandbox/abc123/stop
tempo request -X DELETE ${origin}/sandbox/abc123
\`\`\`

## Notes

- **File operations** use \`path\` as a query parameter, not in the JSON body.
- **Sandbox creation**: Pass \`{}\` for defaults. Do not send cpu/memory/disk for snapshot-based orgs.
- **Toolbox path rewriting**: The proxy rewrites \`/sandbox/{id}/toolbox/...\` to the correct Daytona toolbox path internally.
- **Wildcard routing**: Any toolbox sub-path not explicitly listed above is still routed at $0.0001 (GET/POST/PUT/DELETE).
- **Dry run**: Use \`tempo request --dry-run URL\` to preview cost without paying.
`;
}
