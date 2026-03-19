# Test Plan: cf-sandbox-mpp End-to-End Verification

**API**: `daytona-sandbox-mpp.cnvlabs.workers.dev`
**Tool**: `tempo request` (Tempo CLI)
**Date**: 2026-03-19

---

## Prerequisites

```bash
tempo wallet whoami          # Confirm wallet is logged in with sufficient USDC
tempo wallet login           # If not logged in
```

Set the base URL:
```bash
BASE=https://daytona-sandbox-mpp.cnvlabs.workers.dev
```

---

## Phase 1 — Public Endpoints (no payment)

### 1.1 Health check

```bash
tempo request $BASE/__mpp/health
```

**Expected**: 200 with `{"status":"ok","proxy":"cf-sandbox-mpp",...}`

### 1.2 Config

```bash
tempo request $BASE/__mpp/config
```

**Expected**: 200 with `paymentScheme`, `paymentMethod: "tempo"`, `platformSurcharge`, `upstream`

### 1.3 OpenAPI spec

```bash
tempo request $BASE/openapi.json
```

**Expected**: 200 with valid OpenAPI 3.1.0 document. Verify it contains:
- `/sandbox/{id}/toolbox/process/execute` path
- `x-mpp-charge` on all paid endpoints
- Public endpoints have no `x-mpp-charge`

---

## Phase 2 — Sandbox Lifecycle

### 2.1 List sandboxes

```bash
tempo request $BASE/sandbox
```

**Expected**: 200 with array of sandboxes. Payment of $0.0001 auto-negotiated.

### 2.2 Create a sandbox

```bash
tempo request -X POST \
  --json '{}' \
  -H 'X-Max-Runtime-Seconds: 600' \
  $BASE/sandbox
```

**Expected**: 200 with sandbox object containing `id`, `state: "started"`. Dynamic pricing based on defaults (1 vCPU, 1 GiB RAM, default disk). Save the sandbox ID:

```bash
export SID=<sandbox-id-from-response>
```

### 2.3 Get sandbox details

```bash
tempo request $BASE/sandbox/$SID
```

**Expected**: 200 with full sandbox object. Payment: $0.0001.

### 2.4 List sandboxes (paginated)

```bash
tempo request "$BASE/sandbox/paginated"
```

**Expected**: 200 with paginated response. Payment: $0.0001.

### 2.5 Get toolbox proxy URL

```bash
tempo request $BASE/sandbox/$SID/toolbox-proxy-url
```

**Expected**: 200 with toolbox proxy URL string. Payment: $0.0001.

### 2.6 Set auto-stop interval

```bash
tempo request -X POST $BASE/sandbox/$SID/autostop/30
```

**Expected**: 200. Payment: $0.0001.

---

## Phase 3 — Toolbox: Process Execution

### 3.1 Execute a command (the original blocked use case)

```bash
tempo request -X POST \
  --json '{"command": "python3 -c \"print(2+2)\""}' \
  $BASE/sandbox/$SID/toolbox/process/execute
```

**Expected**: 200 with stdout containing `4`. Payment: $0.0001.
**Previously**: Returned 404 `"Route not configured for billing"`.

### 3.2 Create a process session

```bash
tempo request -X POST \
  --json '{}' \
  $BASE/sandbox/$SID/toolbox/process/sessions
```

**Expected**: 200 with session ID. Payment: $0.0001. Save:

```bash
export PSID=<session-id>
```

### 3.3 List process sessions

```bash
tempo request $BASE/sandbox/$SID/toolbox/process/sessions
```

**Expected**: 200 with array of sessions. Payment: $0.0001.

### 3.4 Execute in session

```bash
tempo request -X POST \
  --json '{"command": "echo hello"}' \
  $BASE/sandbox/$SID/toolbox/process/sessions/$PSID/exec
```

**Expected**: 200 with output. Payment: $0.0001.

### 3.5 Delete process session

```bash
tempo request -X DELETE \
  $BASE/sandbox/$SID/toolbox/process/sessions/$PSID
```

**Expected**: 200. Payment: $0.0001.

---

## Phase 4 — Toolbox: File Operations

### 4.1 List files

```bash
tempo request "$BASE/sandbox/$SID/toolbox/files?path=/"
```

**Expected**: 200 with file listing. Payment: $0.0001.

### 4.2 Create a folder

```bash
tempo request -X POST \
  "$BASE/sandbox/$SID/toolbox/files/folder?path=/home/daytona/test-dir&mode=755"
```

**Expected**: 200. Payment: $0.0001. Note: Daytona expects `path` and `mode` as query parameters, not in the JSON body.

### 4.3 Upload a file

```bash
tempo request -X POST \
  --json '{"path": "/home/daytona/test-dir/hello.py", "content": "cHJpbnQoJ2hlbGxvJyk="}' \
  $BASE/sandbox/$SID/toolbox/files/upload
```

**Expected**: 200. Payment: $0.0001.

### 4.4 Get file info

```bash
tempo request "$BASE/sandbox/$SID/toolbox/files/info?path=/home/daytona/test-dir/hello.py"
```

**Expected**: 200 with file metadata. Payment: $0.0001.

### 4.5 Download a file

```bash
tempo request "$BASE/sandbox/$SID/toolbox/files/download?path=/home/daytona/test-dir/hello.py"
```

**Expected**: 200 with file content. Payment: $0.0001.

### 4.6 Search files

```bash
tempo request "$BASE/sandbox/$SID/toolbox/files/search?path=/home/daytona&pattern=hello"
```

**Expected**: 200 with matching files. Payment: $0.0001.

### 4.7 Delete a file

```bash
tempo request -X DELETE \
  "$BASE/sandbox/$SID/toolbox/files?path=/home/daytona/test-dir/hello.py"
```

**Expected**: 200. Payment: $0.0001.

### 4.8 Get project directory

```bash
tempo request $BASE/sandbox/$SID/toolbox/project-dir
```

**Expected**: 200 with project dir path. Payment: $0.0001.

### 4.9 Get user home directory

```bash
tempo request $BASE/sandbox/$SID/toolbox/user-home-dir
```

**Expected**: 200 with home dir path. Payment: $0.0001.

---

## Phase 5 — Toolbox: Git Operations

### 5.1 Clone a repository

```bash
tempo request -X POST \
  --json '{"url": "https://github.com/octocat/Hello-World.git", "path": "/home/daytona/hello-world"}' \
  $BASE/sandbox/$SID/toolbox/git/clone
```

**Expected**: 200. Payment: $0.001 (higher than wildcard $0.0001).

### 5.2 List branches

```bash
tempo request "$BASE/sandbox/$SID/toolbox/git/branches?path=/home/daytona/hello-world"
```

**Expected**: 200 with branch list. Payment: $0.0001.

### 5.3 Git history

```bash
tempo request "$BASE/sandbox/$SID/toolbox/git/history?path=/home/daytona/hello-world"
```

**Expected**: 200 with commit history. Payment: $0.0001.

---

## Phase 6 — Sandbox Cleanup

### 6.1 Stop the sandbox

```bash
tempo request -X POST $BASE/sandbox/$SID/stop
```

**Expected**: 200 with `state: "stopping"`. Payment: $0.001. Refund webhook should fire for unused runtime.

### 6.2 Delete the sandbox

```bash
tempo request -X DELETE $BASE/sandbox/$SID
```

**Expected**: 200. Payment: $0.001.

---

## Phase 7 — Negative Cases

### 7.1 Unconfigured route returns 404

```bash
tempo request -X PUT $BASE/sandbox/$SID/start
```

**Expected**: 404 `"Route not configured for billing"` (PUT is not a configured method for /start).

### 7.2 POST /sandbox returns dynamic pricing (not flat fee)

Verified implicitly in Step 2.2 — sandbox creation uses `calcPrecharge()`, not FLAT_FEES.

### 7.3 Dry run (preview cost without paying)

```bash
tempo request --dry-run $BASE/sandbox
```

**Expected**: Shows the $0.0001 charge without executing payment.

---

## Results Matrix

| # | Test | Endpoint | Expected Cost | Status |
|---|------|----------|---------------|--------|
| 1.1 | Health | `GET /__mpp/health` | Free | |
| 1.2 | Config | `GET /__mpp/config` | Free | |
| 1.3 | OpenAPI | `GET /openapi.json` | Free | |
| 2.1 | List sandboxes | `GET /sandbox` | $0.0001 | |
| 2.2 | Create sandbox | `POST /sandbox` | Dynamic | |
| 2.3 | Get sandbox | `GET /sandbox/:id` | $0.0001 | |
| 2.4 | List paginated | `GET /sandbox/paginated` | $0.0001 | |
| 2.5 | Toolbox proxy URL | `GET /sandbox/:id/toolbox-proxy-url` | $0.0001 | |
| 2.6 | Set auto-stop | `POST /sandbox/:id/autostop/:interval` | $0.0001 | |
| 3.1 | Execute command | `POST /sandbox/:id/toolbox/process/execute` | $0.0001 | |
| 3.2 | Create session | `POST /sandbox/:id/toolbox/process/sessions` | $0.0001 | |
| 3.3 | List sessions | `GET /sandbox/:id/toolbox/process/sessions` | $0.0001 | |
| 3.4 | Exec in session | `POST /sandbox/:id/toolbox/.../exec` | $0.0001 | |
| 3.5 | Delete session | `DELETE /sandbox/:id/toolbox/.../sessions/:sid` | $0.0001 | |
| 4.1 | List files | `GET /sandbox/:id/toolbox/files` | $0.0001 | |
| 4.2 | Create folder | `POST /sandbox/:id/toolbox/files/folder` | $0.0001 | |
| 4.3 | Upload file | `POST /sandbox/:id/toolbox/files/upload` | $0.0001 | |
| 4.4 | File info | `GET /sandbox/:id/toolbox/files/info` | $0.0001 | |
| 4.5 | Download file | `GET /sandbox/:id/toolbox/files/download` | $0.0001 | |
| 4.6 | Search files | `GET /sandbox/:id/toolbox/files/search` | $0.0001 | |
| 4.7 | Delete file | `DELETE /sandbox/:id/toolbox/files` | $0.0001 | |
| 4.8 | Project dir | `GET /sandbox/:id/toolbox/project-dir` | $0.0001 | |
| 4.9 | Home dir | `GET /sandbox/:id/toolbox/user-home-dir` | $0.0001 | |
| 5.1 | Git clone | `POST /sandbox/:id/toolbox/git/clone` | $0.001 | |
| 5.2 | List branches | `GET /sandbox/:id/toolbox/git/branches` | $0.0001 | |
| 5.3 | Git history | `GET /sandbox/:id/toolbox/git/history` | $0.0001 | |
| 6.1 | Stop sandbox | `POST /sandbox/:id/stop` | $0.001 | |
| 6.2 | Delete sandbox | `DELETE /sandbox/:id` | $0.001 | |
| 7.1 | Wrong method | `PUT /sandbox/:id/start` | N/A (404) | |
| 7.3 | Dry run | `GET /sandbox` | Preview only | |

---

## Key Findings

1. **Toolbox path rewriting required**: Daytona serves toolbox endpoints at `/toolbox/{id}/toolbox/...`, not `/sandbox/{id}/toolbox/...`. Added path rewriting in `proxy.ts` to transform the client-facing path to the Daytona path.

2. **Process sessions not available**: Daytona v0.153.0 returns 404 for `/toolbox/{id}/toolbox/process/sessions`. The process `execute` endpoint works fine — sessions may be a newer/different API.

3. **Some file ops need query params**: Daytona expects `path` as a query parameter for file operations (e.g. `files/folder`, `files` DELETE), not in the JSON body. Test commands updated to reflect this.

4. **All proxy routing works correctly**: Every tested endpoint was correctly routed, payment was auto-negotiated, and the toolbox path rewriting worked as expected.

---

## Notes

- **Snapshot orgs**: Do not pass `cpu`/`memory`/`disk` in the create body — Daytona rejects resource params for snapshot-based orgs. Use `--json '{}'`.
- **Git clone pricing**: Intentionally 10x more than other toolbox ops ($0.001 vs $0.0001) due to network/IO cost.
- **Wildcard routing**: Toolbox routes use `GET/POST/DELETE /sandbox/:id/toolbox/*` catch-alls. Specific overrides (git/clone) are matched first due to FLAT_FEES insertion order.
- **Toolbox path rewriting**: Proxy rewrites `/sandbox/:id/toolbox/...` → `/toolbox/:id/toolbox/...` before forwarding to Daytona.
- **Auto-stop**: Sandbox auto-stopped during testing (30-minute interval). Had to restart mid-test.
