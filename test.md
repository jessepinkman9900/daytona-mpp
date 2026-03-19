# Manual Test Plan — cf-sandbox-mpp

**Base URL:** `https://daytona-sandbox-mpp.cnvlabs.workers.dev`

---

## 1. Health & Config

```bash
curl https://daytona-sandbox-mpp.cnvlabs.workers.dev/__mpp/health
curl https://daytona-sandbox-mpp.cnvlabs.workers.dev/__mpp/config
```

**Expected:** `status: "ok"`, config shows `platformSurcharge: "0.10"`, masked `payTo`.

---

## 2. Verify 402 Payment Gate

```bash
curl -i -X POST https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `402 Payment Required`, `WWW-Authenticate: Payment ...` header.
Amount should be `$0.01 * 1.10 = $0.011` (base + 10% surcharge).

---

## 3. Create a Sandbox

```bash
tempo request -v -X POST https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox \
  -H "Content-Type: application/json" \
  -d '{"name":"test-sandbox-'$(date +%s)'"}'
```

**Expected:** `200` with Daytona sandbox JSON. Save the `id`:
```bash
SANDBOX_ID=<id from response>
```

---

## 4. Execute Python Code

```bash
tempo request -v -X POST https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox/$SANDBOX_ID/toolbox/process/execute \
  -H "Content-Type: application/json" \
  -d '{"command":"python3 -c '\''import sys; print(f\"Hello from sandbox! Python {sys.version}\"); print(f\"2+2={2+2}\")'\''","cwd":"/home/daytona"}'
```

**Expected:** `200` with `exitCode: 0` and Python output in `result`.

---

## 5. Delete the Sandbox

```bash
tempo request -v -X DELETE https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox/$SANDBOX_ID
```

**Expected:** `200` with sandbox JSON showing `state: "destroying"`.

---

## 6. Verify Cleanup

```bash
tempo request -v https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox
```

**Expected:** Deleted sandbox no longer in list (or shows `state: "destroyed"`).
