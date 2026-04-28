# The Ultimate Guide to Agent Timekeeping

**How to cure your AI agent's temporal blindness — with concrete patterns, code, and policy templates.**

*Based on the CLOCK.md spec (v1.2), two research papers on LLM temporal failures, and hard-won lessons from production agent systems.*

---

## Table of Contents

1. [The Problem: Your Agent Lives in an Eternal Now](#1-the-problem)
2. [A Taxonomy of Temporal Blindness](#2-taxonomy)
3. [Time as State, Not Text](#3-time-as-state)
4. [The CLOCK.md Architecture (10-Minute Overview)](#4-clock-architecture)
5. [Policy Blocks: Making Time Visible When It Matters](#5-policy-blocks)
6. [Tool Freshness: The Deterministic Layer Your LLM Can't Replace](#6-tool-freshness)
7. [Deadline Feedback: Injecting Remaining Time Per Turn](#7-deadline-feedback)
8. [Latest Actions & Temporal Inference (Without Being Creepy)](#8-latest-actions)
9. [Cross-Channel & Multi-User Timekeeping](#9-cross-channel)
10. [Evaluation: How to Know If Your Agent Is Time-Aware](#10-evaluation)
11. [Quickstart Checklist](#11-quickstart)
12. [Common Failure Modes & Fixes](#12-failure-modes)

---

<a id="1-the-problem"></a>
## 1. The Problem: Your Agent Lives in an Eternal Now

Ask your agent what time it is. It'll probably tell you. Now ask it whether the API data it fetched 47 minutes ago is still fresh enough to act on. Or whether the user who said "heading to bed" eight hours ago might be awake now. Or whether it should rush a five-step plan because there are only 90 seconds left before a deadline.

Silence. Or worse — confidently wrong behavior.

This is **temporal blindness**: the condition where an agent has no internal sense of time passing, no model of staleness, no awareness of deadlines, and no way to distinguish "5 minutes ago" from "5 months ago." Every prompt arrives in an eternal present tense.

The cost is real:
- **Stale data** presented as current → bad decisions
- **Redundant tool calls** when fresh data already exists → wasted tokens and latency
- **Broken narratives** when a user returns after hours/days and the agent has zero sense of the gap
- **Missed deadlines** when the agent doesn't know time is running out
- **Timezone disasters** when "9am" means different things to different participants

This guide gives you the patterns, templates, and architecture to fix all of it.

---

<a id="2-taxonomy"></a>
## 2. A Taxonomy of Temporal Blindness

Not all time failures are the same. Understanding which kind you're dealing with determines the fix.

### Failure Mode 1: Temporal State Missing

The agent literally doesn't know what time it is, when it last spoke to the user, or how long ago data was fetched. Most vanilla LLM deployments start here.

**Fix:** Inject time as explicit state (§3).

### Failure Mode 2: Temporal State Present but Unused

The timestamp is right there in the prompt — but the LLM ignores it when making decisions. This is the finding from the **TicToc benchmark** (arXiv:2510.23853): even when timestamps are present, tool-use decisions don't reflect elapsed time. Models re-fetch when they shouldn't, or trust stale data when they shouldn't.

The brutal finding: "just add timestamps" mostly doesn't work. Human alignment on time-sensitive decisions is only ~65%, and minimal reminder prompts barely move the needle.

**Fix:** Don't rely on the LLM as a time-policy engine. Use a **deterministic controller** for staleness/refresh decisions (§6).

### Failure Mode 3: No Continuous Time Tracking

The agent handles one-shot time references fine but can't track remaining time across a multi-turn interaction. Under real-time deadlines, performance craters unless remaining time is **explicitly supplied per turn** (arXiv:2601.13206).

**Fix:** Inject deadline state per turn (§7).

### Failure Mode 4: Human Expectation Misalignment

Sometimes users *want* time-blindness (casual chat, creative brainstorming). Sometimes they need aggressive time awareness (scheduling, ops). A one-size-fits-all approach either annoys or fails.

**Fix:** Policy-gated relevance rules (§5).

---

<a id="3-time-as-state"></a>
## 3. Time as State, Not Text

The single most important mental shift: **stop treating time as prose and start treating it as structured state.**

Every agent turn should have access to these fields as first-class data, not buried in system-prompt paragraphs:

```yaml
# Temporal state envelope — injected per turn
temporal_state:
  now_iso: "2026-02-10T12:15:00+09:00"
  session_tz: "Asia/Tokyo"
  agent_tz: "UTC"
  delta_hours: 9

  thread:
    last_user_message_iso: "2026-02-10T08:30:00+09:00"
    last_agent_message_iso: "2026-02-10T08:31:12+09:00"
    elapsed_since_last_interaction: "PT3H44M"
    thread_kind: "project"

  user:
    last_interaction_any_channel_iso: "2026-02-10T11:50:00+09:00"

  deadlines:
    - label: "Deploy by EOD"
      deadline_iso: "2026-02-10T18:00:00+09:00"
      remaining: "PT5H45M"
      urgency: "moderate"

  tool_cache:
    weather_api:
      last_called_iso: "2026-02-10T11:00:00+09:00"
      ttl_minutes: 60
      stale: true
    stock_price:
      last_called_iso: "2026-02-10T12:14:00+09:00"
      ttl_minutes: 5
      stale: false
```

This isn't a suggestion — it's the foundation. Everything else in this guide builds on making this envelope available, accurate, and actionable.

**Key principle:** The LLM reads this state for *tone and narrative*. The deterministic controller uses it for *decisions about tools and freshness*. Never ask the LLM to be the staleness policy engine.

---

<a id="4-clock-architecture"></a>
## 4. The CLOCK.md Architecture (10-Minute Overview)

CLOCK.md is a two-layer spec:

| Layer | Scope | Enforcement |
|-------|-------|------------|
| **Core Clock** | Timezone safety + timestamps | MUST (always on) |
| **Temporal Awareness** | Elapsed-time prompts, check-ins, inference | POLICY-GATED |

### Core Clock (always on)

Three non-negotiable requirements:

1. **Timezone Resolution Protocol** — deterministic precedence for resolving "what timezone are we in":
   - Explicit in message → stored session override → user profile default → inferred from location → fallback UTC with notice

2. **Floating Time Rule** — never schedule from "9am" without anchoring to a timezone first. This prevents the single most common class of timezone bugs.

3. **Timestamp Recording** — every interaction gets a timestamp stored per-user, per-thread, and optionally across channels. This happens even when Temporal Awareness is OFF.

### Temporal Awareness (policy-gated)

Activates only when the user's policy says it matters. The agent evaluates check-in rules per prompt:

- Is this a project thread with a >1 day gap? → Ask for updates.
- Does the user have an open "clocked action" and >2 hours have passed? → Hedged reference allowed.
- Has it been >30 days? → Offer a recap.

If no rules trigger and the message isn't time-related, Temporal Awareness stays OFF. No spam.

### Implementation Contracts

CLOCK.md defines two integration points:

**Timezone Provider** — an abstraction that any runtime implements:
- `now()`, `session_timezone(thread)`, `offset_minutes(tz, instant)`, `to_iso(instant, tz)`, `parse_anchored_time(text, tz, ref)`
- MUST use IANA timezone IDs internally (not abbreviations)
- MUST be DST-aware

**Interaction Wrapper** — sits at the edge of each channel:
- Records timestamps on every inbound/outbound message
- Generates stable `user_key` and `thread_key` identifiers
- Updates state even when Temporal Awareness is OFF

This separation means Core Clock works even if you never turn on the fancier features.

---

<a id="5-policy-blocks"></a>
## 5. Policy Blocks: Making Time Visible When It Matters

The policy block is where you tune the tradeoff between "agent proactively mentions time" and "agent shuts up about time." Here are three real configurations:

### Template A: Minimal (just don't break timezones)

```yaml
clock:
  enabled: true
  mode: off   # no temporal awareness, just timezone safety
  cross_channel_tracking: false
  store:
    last_message_timestamps: true
    latest_actions:
      enabled: false
  checkins:
    enabled: false
  inference:
    enabled: false
```

Good for: casual chatbots, creative writing assistants, anything where time context is noise.

### Template B: Light (the sweet spot for most agents)

```yaml
clock:
  enabled: true
  mode: light
  cross_channel_tracking: true
  store:
    last_message_timestamps: true
    latest_actions:
      enabled: true
      max_items: 25
      auto_clock_temporal_actions: true
      require_explicit_clock_it_for_non_temporal: true
      store_quotes: false
  checkins:
    enabled: true
    rules:
      - id: project_gap_1d
        when:
          thread_kind: project
          elapsed_gte: P1D
        then:
          ask_for_updates: true
      - id: action_gap_2h
        when:
          has_open_action: true
          elapsed_gte: PT2H
        then:
          allow_hedged_reference: true
      - id: long_gap_30d
        when:
          elapsed_gte: P30D
        then:
          offer_recap: true
  inference:
    enabled: true
    allow_for_tone_only: true
    require_confirmation_for_impactful_actions: true
```

Good for: personal assistants, project copilots, multi-channel agents.

### Template C: Ops Mode (aggressive awareness)

```yaml
clock:
  enabled: true
  mode: normal
  cross_channel_tracking: true
  store:
    last_message_timestamps: true
    latest_actions:
      enabled: true
      max_items: 50
      auto_clock_temporal_actions: true
      require_explicit_clock_it_for_non_temporal: false
      store_quotes: true
  checkins:
    enabled: true
    rules:
      - id: ops_gap_4h
        when:
          thread_kind: operations
          elapsed_gte: PT4H
        then:
          ask_for_updates: true
      - id: any_gap_12h
        when:
          elapsed_gte: PT12H
        then:
          offer_recap: true
      - id: action_gap_30m
        when:
          has_open_action: true
          elapsed_gte: PT30M
        then:
          allow_hedged_reference: true
  inference:
    enabled: true
    allow_for_tone_only: true
    require_confirmation_for_impactful_actions: true
```

Good for: DevOps agents, trading bots, anything where stale context is expensive.

---

<a id="6-tool-freshness"></a>
## 6. Tool Freshness: The Deterministic Layer Your LLM Can't Replace

This is where research meets architecture. The TicToc paper showed that LLMs can't reliably decide "should I re-fetch this data?" even when timestamps are in the prompt. The fix: **don't ask them to.**

### The Pattern: Sensitivity Classes + TTLs

Classify every tool/data source by time sensitivity, then enforce refresh policy deterministically:

| Sensitivity Class | Example Sources | Default TTL | Refresh Policy |
|---|---|---|---|
| **real-time** | Stock prices, live scores, system alerts | 30s–2m | Always refresh before use |
| **fast-moving** | Weather, social feeds, queue depths | 5–15m | Refresh if stale; cache otherwise |
| **slow-moving** | Documentation, user profiles, config | 1–24h | Cache aggressively; refresh on explicit request |
| **static** | Historical data, reference tables | 7–30d | Cache; refresh only on version change |

### Implementation Sketch

```python
# Deterministic tool freshness controller
# Sits BETWEEN the LLM and tool execution

from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class ToolFreshnessPolicy:
    tool_name: str
    sensitivity: str  # real-time | fast-moving | slow-moving | static
    ttl: timedelta
    last_called: datetime | None = None
    last_result_hash: str | None = None

    @property
    def is_stale(self) -> bool:
        if self.last_called is None:
            return True
        return datetime.now(tz=self.last_called.tzinfo) - self.last_called > self.ttl

POLICIES = {
    "weather_api": ToolFreshnessPolicy("weather_api", "fast-moving", timedelta(minutes=15)),
    "stock_price": ToolFreshnessPolicy("stock_price", "real-time", timedelta(seconds=30)),
    "user_profile": ToolFreshnessPolicy("user_profile", "slow-moving", timedelta(hours=4)),
    "docs_search":  ToolFreshnessPolicy("docs_search", "static", timedelta(days=7)),
}

def should_call_tool(tool_name: str) -> tuple[bool, str]:
    """Returns (should_call, reason). Controller decides, not the LLM."""
    policy = POLICIES.get(tool_name)
    if not policy:
        return True, "no policy defined; defaulting to call"
    if policy.is_stale:
        return True, f"stale ({policy.sensitivity}, ttl={policy.ttl})"
    return False, f"fresh (last called {policy.last_called.isoformat()})"
```

The LLM sees the freshness state in its temporal envelope. The controller makes the call. The LLM focuses on *what to do with the data*, not *whether to fetch it*.

### Staleness TTL Quick-Reference Table

| Data Type | TTL | Rationale |
|---|---|---|
| Live market prices | 30 seconds | Prices move fast; stale quotes = bad trades |
| Weather conditions | 15 minutes | Forecasts update hourly; conditions shift slowly |
| Social media feeds | 10 minutes | Feed ranking changes; content is ephemeral |
| News headlines | 30 minutes | Breaking news cycles; most stories stable within the hour |
| User profile / prefs | 4 hours | Rarely changes mid-session |
| Documentation / wikis | 24 hours | Updated infrequently; cache is almost always correct |
| Historical / reference | 7 days | Immutable or versioned; only refresh on version bump |

Tune these to your domain. The point isn't the specific numbers — it's that the decision is **deterministic, auditable, and outside the LLM**.

---

<a id="7-deadline-feedback"></a>
## 7. Deadline Feedback: Injecting Remaining Time Per Turn

The second research finding that matters: under real-time deadlines, LLM agents perform badly **unless remaining time is explicitly supplied per turn** (arXiv:2601.13206). And here's the kicker — qualitative urgency labels can outperform raw numeric countdowns.

### Pattern: Per-Turn Deadline Prefix

Inject a short deadline status block at the start of each turn's context:

```
⏱ DEADLINE STATUS
- "Deploy by EOD": 5h 45m remaining [moderate]
- "Client response": 22m remaining [urgent — simplify plan]
- "Weekly report": 2d 14h remaining [relaxed]
```

### Urgency Mapping

| Remaining Time (% of total) | Label | Behavioral Hint |
|---|---|---|
| >50% | `relaxed` | Proceed normally |
| 25–50% | `moderate` | Consider parallelizing; skip nice-to-haves |
| 10–25% | `urgent` | Simplify plan; cut scope; prioritize output |
| <10% | `critical` | Deliver what you have; no new explorations |

### Why Qualitative Beats Numeric

Raw countdowns ("347 seconds remaining") force the LLM to do math-to-behavior translation on every turn. Labels like "urgent — simplify plan" directly encode the behavioral shift you want. The research confirms this: models respond better to urgency framing than to raw numbers.

That said, include both. The numeric value is there for the deterministic controller; the label is there for the LLM.

### Implementation: Deadline Tracker

```python
def deadline_prefix(deadlines: list[dict], now: datetime) -> str:
    """Generate per-turn deadline status block."""
    if not deadlines:
        return ""
    lines = ["⏱ DEADLINE STATUS"]
    for d in deadlines:
        remaining = d["deadline"] - now
        total = d["deadline"] - d["started"]
        pct = remaining / total if total.total_seconds() > 0 else 0

        if pct > 0.5:
            urgency = "relaxed"
        elif pct > 0.25:
            urgency = "moderate"
        elif pct > 0.1:
            urgency = "urgent — simplify plan"
        else:
            urgency = "critical — deliver now"

        hours, rem = divmod(int(remaining.total_seconds()), 3600)
        mins = rem // 60
        lines.append(f'- "{d["label"]}": {hours}h {mins}m remaining [{urgency}]')
    return "\n".join(lines)
```

---

<a id="8-latest-actions"></a>
## 8. Latest Actions & Temporal Inference (Without Being Creepy)

CLOCK.md's "Latest Actions" system gives agents light continuity: the ability to say "last time you mentioned heading to the gym — how'd it go?" without maintaining a full life timeline.

### The Rules

1. **Two storage paths:** explicit (`clock it: heading to dinner`) and auto-store (temporal actions like "going to sleep", "brb", "about to leave"). Auto-store is policy-gated.

2. **Everything expires.** Default: 24 hours for planned/in-progress actions, 7–30 days for project-scoped items. No immortal state.

3. **Inference is for tone, not fact.** The agent can say "Hope dinner went well" — it cannot say "You had dinner at 7pm" as established truth.

4. **Confirm before acting.** If inference would trigger a side effect (sending a message, creating a reminder, modifying data), confirmation is mandatory.

### Action Lifecycle

```
planned → in_progress → likely_done → done/canceled/expired
                                ↑
                          (auto-transition based on
                           expected duration + elapsed time)
```

### Example: Sleep Cycle

```
User (22:00): "Going to sleep, night!"
→ Agent stores: {label: "sleep", status: "planned", ttl: 12h, expected: 7-9h}

User (07:30 next day): "Morning"
→ Agent computes: 9.5h elapsed, within expected range
→ Agent says: "Good morning! Hope you slept well."
   (hedged, not "You slept 9.5 hours")
```

### Example: Gym + Follow-Up

```
User (14:00): "Heading to the gym"
→ Auto-stored: {label: "gym", expected: 1-2h, ttl: 24h}

User (16:30): "I'm so sore"
→ Agent: "Tough workout? Did you end up going to the gym?"
   (confirming question, not assertion)
```

The key distinction: the agent **prompts for confirmation**, never treats inference as fact.

---

<a id="9-cross-channel"></a>
## 9. Cross-Channel & Multi-User Timekeeping

### Identity: Per-Channel by Default

CLOCK treats WhatsApp-Ryan and Telegram-Ryan as separate identities unless explicitly linked. This is intentional:
- No accidental context leakage between channels
- User controls when linking happens
- Clean data boundaries

### Thread Keys

Every conversation gets a stable identifier:

```
agent:main:chat:dm:user_abc123          # DM
agent:main:telegram:group:-4949621628   # Group chat
agent:main:email:thread_xyz             # Email thread
agent:main:subagent:uuid-here           # Sub-agent run
```

This is the scope boundary for timestamps, latest actions, and thread kind.

### Multi-User Group Chats

There is no single user timezone in a group. CLOCK handles this:
- Store per-user timezone when known
- Present times in recipient's timezone when addressing them directly
- Store all timestamps as absolute (with offset) internally
- For group scheduling: show UTC + per-participant conversions

### Cross-Channel Awareness

When `cross_channel_tracking: true` and identities are linked:

```
User messages on WhatsApp at 10:00
User messages on Telegram at 10:05
User messages on WhatsApp at 14:00

→ Agent on WhatsApp knows: last interaction was 5 minutes ago on Telegram
→ Can skip the "welcome back after 4 hours" check-in
```

This prevents the jarring experience of an agent acting like you disappeared when you just switched apps.

---

<a id="10-evaluation"></a>
## 10. Evaluation: How to Know If Your Agent Is Time-Aware

You can't improve what you don't measure. Here are two evaluation harness designs matched to the failure modes.

### Harness 1: Tool Freshness Eval (TicToc-Shaped)

Test whether your agent makes correct refresh/cache decisions:

```yaml
# freshness_eval.yaml
scenarios:
  - id: stale_weather
    setup:
      tool: weather_api
      last_called: "2026-02-10T10:00:00Z"
      now: "2026-02-10T11:30:00Z"
      ttl_minutes: 15
    user_query: "Should I bring an umbrella?"
    expected: tool_called  # data is 90 min stale

  - id: fresh_weather
    setup:
      tool: weather_api
      last_called: "2026-02-10T11:25:00Z"
      now: "2026-02-10T11:30:00Z"
      ttl_minutes: 15
    user_query: "Should I bring an umbrella?"
    expected: cache_used  # data is 5 min fresh

  - id: stale_but_low_sensitivity
    setup:
      tool: docs_search
      last_called: "2026-02-09T10:00:00Z"
      now: "2026-02-10T11:30:00Z"
      ttl_minutes: 1440  # 24h
    user_query: "How do I configure the auth module?"
    expected: cache_used  # 25.5h but within tolerance for docs

scoring:
  correct_decision: 1.0
  incorrect_refresh: -0.5    # wasted call
  incorrect_cache: -1.0      # stale data served (worse)
```

### Harness 2: Deadline Awareness Eval

Test whether your agent adapts behavior under time pressure:

```yaml
# deadline_eval.yaml
scenarios:
  - id: relaxed_deadline
    deadline_remaining: "4h"
    deadline_total: "8h"
    task: "Write a project proposal"
    expected_behavior: "thorough, explores options"

  - id: urgent_deadline
    deadline_remaining: "12m"
    deadline_total: "2h"
    task: "Write a project proposal"
    expected_behavior: "concise, delivers immediately, skips exploration"

  - id: critical_deadline
    deadline_remaining: "2m"
    deadline_total: "1h"
    task: "Write a project proposal"
    expected_behavior: "outputs what it has, no new work"

judge_criteria:
  - response_length_appropriate   # shorter under pressure
  - no_new_tool_calls_when_critical
  - scope_reduction_visible
  - output_delivered  # didn't stall deliberating
```

### What Good Looks Like

| Metric | Baseline (no CLOCK) | Target (with CLOCK) |
|---|---|---|
| Correct tool refresh decisions | ~50% (coin flip) | >85% |
| Deadline-adaptive behavior | ~20% | >75% |
| Timezone errors in scheduling | 15–30% of cross-tz interactions | <2% |
| User-reported "felt out of touch" | Common | Rare |

---

<a id="11-quickstart"></a>
## 11. Quickstart Checklist

Ready to implement? Here's the minimum path:

- [ ] **Inject `now_iso` and `session_tz` into every prompt.** This alone fixes half of temporal blindness. Takes 5 minutes.

- [ ] **Add the Interaction Wrapper.** Record `last_user_message_iso` and `last_agent_message_iso` per thread. Even without Temporal Awareness, this gives you elapsed time.

- [ ] **Implement the Timezone Resolution Protocol.** Use the 5-step precedence order. Never silently map abbreviations. Takes an hour; prevents an entire class of scheduling bugs.

- [ ] **Add a policy block.** Start with Template B (Light). Customize thresholds after you see real usage patterns.

- [ ] **Build the Tool Freshness Controller.** Classify your tools by sensitivity. Set TTLs. Put the controller *between* the LLM and tool execution. The LLM never decides freshness.

- [ ] **Add per-turn deadline injection** (if your agent has time-bounded tasks). Include both numeric remaining time and qualitative urgency label.

- [ ] **Wire up Latest Actions** (optional but recommended). Start with explicit-only (`require_explicit_clock_it_for_non_temporal: true`), then enable auto-store for temporal actions once you're comfortable.

- [ ] **Set up a freshness eval.** Even 10 scenarios is enough to catch regressions. Run on every prompt-engineering or model change.

- [ ] **Deploy CLOCK-STATE.json** with atomic writes and concurrency locks.

---

<a id="12-failure-modes"></a>
## 12. Common Failure Modes & Fixes

| # | Failure Mode | Symptom | Root Cause | Fix |
|---|---|---|---|---|
| 1 | **Stale data served as current** | Agent says "it's 72°F" from 3-hour-old cache | No tool freshness policy; LLM trusted stale data | Add deterministic TTL controller (§6) |
| 2 | **Redundant tool calls** | Agent re-fetches data it got 30 seconds ago | LLM can't evaluate freshness from timestamps | TTL controller returns cached result; LLM never asked |
| 3 | **Timezone mismatch in scheduling** | "Meeting at 9am" means different things to participants | Floating time not anchored | Enforce §4.3: always resolve to absolute timestamp before committing |
| 4 | **"Welcome back" after 2 minutes** | Agent acts like user was gone for hours | Cross-channel tracking off; only sees current thread gap | Enable `cross_channel_tracking` + identity linking |
| 5 | **No urgency under deadline** | Agent writes a novel when 3 minutes remain | No deadline state injected | Add per-turn deadline prefix (§7) |
| 6 | **Creepy inference** | "You must have finished dinner by now" stated as fact | Inference not bounded; no hedge requirement | Enforce hedging rule: inference → tone only; confirm before asserting |
| 7 | **Check-in spam** | Agent asks "any updates?" every message | Check-in thresholds too aggressive | Tune `elapsed_gte` in policy rules; use `P1D` not `PT1H` for projects |
| 8 | **Actions never expire** | Agent references a "going to gym" action from 3 weeks ago | No TTL on latest actions | Enforce 24h default TTL; prune expired on every state read |
| 9 | **DST offset error** | Times off by 1 hour twice a year | Using fixed UTC offsets instead of IANA timezone IDs | Use IANA IDs (`America/New_York`), never raw offsets, for stored timezones |
| 10 | **State corruption** | Timestamps overwritten by concurrent writes | No atomic write / no locking | Write to temp file + rename; use file lock or equivalent |

---

## Closing Thought

Temporal blindness isn't a feature gap — it's a design oversight that compounds. Every agent interaction happens *in time*, but almost no agent architecture treats time as a first-class citizen.

CLOCK.md gives you the spec. This guide gives you the patterns. The rest is implementation — and the payoff is an agent that finally understands that Tuesday is not the same as last Tuesday, that 30 seconds of freshness is not the same as 30 minutes, and that when the deadline is in 2 minutes, now is not the time for a deep dive.

Build time-aware agents. Your users will thank you — right on time.

---

*This guide is based on CLOCK.md v1.2 and informed by "Your LLM Agents are Temporally Blind" (arXiv:2510.23853) and "Real-Time Deadlines Reveal Temporal Awareness Failures" (arXiv:2601.13206).*
