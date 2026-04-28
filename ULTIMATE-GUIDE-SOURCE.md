# Source notes (verbatim) — Ryan (2026-02-10)

(Keep these points, but workshop into a cohesive paid-quality guide.)

## Taxonomy of temporal blindness (4 failure modes)
1) Temporal state missing
2) Temporal state present but unused (TicToc)
3) Continuous time tracking (deadlines paper)
4) Human expectation alignment (product/policy)

## Paper 1: “Your LLM Agents are Temporally Blind” (arXiv:2510.23853)
- Tool-use decisions don’t reflect elapsed time → stale context vs redundant tool calls.
- TicToc benchmark: low/medium/high time sensitivity.
- “Just add timestamps” mostly doesn’t work; human alignment ceiling ~65%.
- Minimal reminder prompts don’t help; few-shot rules help some models; prompting limited.
- DPO/post-training can help (learnable).

Implications:
- Don’t bet on LLM to be time policy engine.
- Use deterministic controller for tool refresh decisions (TTLs, sensitivity classes).

## Paper 2: “Real-Time Deadlines Reveal Temporal Awareness Failures…” (arXiv:2601.13206)
- Under real-time deadlines, performance poor unless remaining time is supplied per turn.
- Qualitative urgency prefix can outperform numeric countdown.

Implications:
- Remaining time is a first-class state variable; inject per turn / decision-locally.

## X / community thread pain
- People experience “everything is now” and narrative time gaps break.
- Product/policy: sometimes people want blindness → user-configurable gate.

## Where CLOCK.md lands
Solves well:
- state missing (now/elapsed/tz)
- policy gating
- cross-channel last interaction tracking

Doesn’t fully solve:
- state present but unused (TicToc)
- continuous time (deadline tracking)

Therefore include non-LLM temporal controller for:
1) tool freshness policy
2) deadline feedback policy

## Practical step-by-step ideas
- Treat time as state, not text (explicit fields: now, tz, last interaction, elapsed, deadlines, last tool call timestamps)
- Policy-gated relevance rules
- Deterministic tool freshness layer (classes + TTL + cache + forced refresh)
- Per-turn deadline feedback (numeric or urgency)
- Separate tone inference vs action inference; confirm before side effects
- Keep latest actions small + expiring + user-controlled
- Cross-channel indexing with clean scope
- Make time visible when it matters, invisible when it doesn’t
- Evaluate with TicToc-shaped freshness eval + deadline-shaped eval

## Suggested CLOCK.md tuning knobs
- check-in thresholds (P3D vs P1D)
- latest-actions aggressiveness (auto clock vs explicit)
- tool_freshness TTL config
- deadline feedback rule
- per-user calibration bounded
- group chat defaults (UTC storage + user-specific display)
