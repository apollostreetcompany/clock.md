# clock.md (protocol)

`clock.md` is a lightweight protocol/spec you can add to an AI agent so it can reason about time (and ask for it when needed).

This repo is intentionally **protocol-only** (no landing page source).

## Install

### One-liner

```bash
curl -fsSL https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/clock.md -o clock.md
```

### Install script

```bash
curl -fsSL https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/scripts/install.sh | bash -s -- ~/.config/clock.md/clock.md
```

### OpenClaw

Recommended location:

```bash
curl -fsSL https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/clock.md -o ~/.openclaw/clock.md
```

Then include the contents of `~/.openclaw/clock.md` in your agent/system prompt.

### Other agents (Cursor / Claude / ChatGPT)

Paste the contents of `clock.md` into your system prompt / custom instructions / project rules.

## Canonical file

- `clock.md` (in repo root)
