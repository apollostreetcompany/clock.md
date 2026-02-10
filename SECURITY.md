# Security (clock.md protocol repo)

This repository is intentionally **protocol-only**.

It contains:
- `clock.md` (the spec)
- `scripts/install.sh` (a tiny downloader)
- docs (`README.md`, this file)

It **does not** contain:
- web app / landing page source
- API keys / tokens
- any executable binaries

## Threat model (what you should care about)

### 1) Supply-chain tampering
If someone modifies `clock.md` (or `install.sh`) upstream, every installer that pulls `raw.githubusercontent.com/...` could ingest malicious prompt content or a malicious script.

Mitigations:
- Keep this repo minimal.
- Review diffs on every change.
- Prefer pinning to a commit SHA for high-assurance installs.

### 2) Installer script safety
`scripts/install.sh`:
- downloads a single file from the canonical raw URL
- writes it to a target path
- requires `curl` or `wget`
- does **not** execute downloaded content

## How to audit

### Audit the repo contents

```bash
git ls-tree -r --name-only HEAD
```

You should see only the small set of files listed above.

### Audit the installer

```bash
sed -n '1,200p' scripts/install.sh
shellcheck scripts/install.sh  # optional
```

Checks:
- uses `set -euo pipefail`
- downloads to a temp file then moves it
- no `eval`, no piping downloaded content into `bash` inside the script

### Audit the spec (`clock.md`)

```bash
sed -n '1,220p' clock.md
```

Checks:
- no embedded secrets
- no instructions that cause agents to reveal secrets
- no tool/command instructions that could be destructive

### High-assurance install (pin to a commit)

Instead of installing from `master`, pin to a specific commit SHA:

```bash
SHA="<commit-sha>"
curl -fsSL "https://raw.githubusercontent.com/apollostreetcompany/clock.md/${SHA}/clock.md" -o clock.md
```

This prevents silent changes from affecting your install.

## Reporting issues

If you ever see unexpected files in this repo or surprising behavior in `install.sh`, treat it as a potential compromise:
- stop using raw installs
- pin to last-known-good commit
- open an issue with details
