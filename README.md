# clock.md

`clock.md` is a lightweight spec you can add to an AI agent so it can reason about time (and ask for it when needed).

## INSTALL

### One-liner (download raw `clock.md`)

```bash
curl -fsSL https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/clock.md -o clock.md
```

### Install script

Downloads the canonical `clock.md` from GitHub to a target path:

```bash
curl -fsSL https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/scripts/install.sh | bash -s -- ~/.config/clock.md/clock.md
```

### OpenClaw

Recommended location:

```bash
curl -fsSL https://raw.githubusercontent.com/apollostreetcompany/clock.md/master/clock.md -o ~/.openclaw/clock.md
```

Then add the contents of `~/.openclaw/clock.md` to your OpenClaw agent’s system prompt (or include it by reference if your OpenClaw config supports file includes).

### Other agents (Cursor / Claude / ChatGPT / etc.)

1. Download `clock.md` (one-liner above), or open it on GitHub and copy the file contents.
2. Paste the contents into your agent’s **system prompt / custom instructions / project rules**.
3. If your agent can’t reliably read the current time, start each session by providing your current timezone and the current date/time.

## Links

- Spec: `clock.md`
- Landing site source: `landing/`

