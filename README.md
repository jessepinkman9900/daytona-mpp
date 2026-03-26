# daytona-sandbox-mpp

A [Tempo MPP](https://tempo.build) (micropayment proxy) for the [Daytona](https://daytona.io) sandbox API, deployed on Cloudflare Workers.

Every API call is automatically priced and paid in USDC via the Tempo payment network — no API keys required for callers.

## How agents can use it

AI agents interact with this proxy exactly like a REST API, using `tempo request` instead of `curl`. The proxy handles payment negotiation transparently per-request.

Agents can:
- Create and manage cloud dev sandboxes
- Execute commands inside sandboxes
- Upload/download files
- Run Git operations (clone, commit, push, pull)
- Open SSH sessions

All capabilities and pricing are machine-readable at [`/llms.txt`](https://daytona-sandbox-mpp.cnvlabs.workers.dev/llms.txt).

## Quick start with Claude

```
claude "Read https://daytona-sandbox-mpp.cnvlabs.workers.dev/llms.txt and use it to create a sandbox, run echo hello world inside it, then delete it."
```

Or reference it in a more complex agentic workflow:

```
claude "Using the sandbox API at https://daytona-sandbox-mpp.cnvlabs.workers.dev/llms.txt, clone https://github.com/octocat/Hello-World into a sandbox, run the tests, and report the output."
```

## Endpoints

Full pricing and endpoint list: [`/llms.txt`](https://daytona-sandbox-mpp.cnvlabs.workers.dev/llms.txt) | [`/openapi.json`](https://daytona-sandbox-mpp.cnvlabs.workers.dev/openapi.json)

| Category | Example endpoints | Cost |
|---|---|---|
| Sandbox lifecycle | `POST /sandbox`, `DELETE /sandbox/{id}` | $0.001–$0.01 |
| Process execution | `POST /sandbox/{id}/toolbox/process/execute` | $0.0001 |
| File operations | upload, download, search, replace | $0.0001 |
| Git | clone, commit, push, pull, branch | $0.0001–$0.001 |
| SSH access | create/revoke tokens | $0.0001–$0.001 |

## Prerequisites

```bash
npm install -g tempo
tempo wallet login
```

## Example

```bash
# Create a sandbox
tempo request -X POST --json '{}' https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox

# Run a command in it
tempo request -X POST \
  --json '{"command": "python3 -c \"print(42)\""}' \
  https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox/<id>/toolbox/process/execute

# Clean up
tempo request -X DELETE https://daytona-sandbox-mpp.cnvlabs.workers.dev/sandbox/<id>
```

## Development

```bash
npm install
npm run dev       # local wrangler dev server
npm test          # run tests
npm run deploy    # deploy to Cloudflare Workers
```
