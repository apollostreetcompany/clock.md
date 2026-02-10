# CLOCK.md — Time Context, Cross-Channel Memory & Temporal Awareness

**Version:** 1.2  
**Status:** Canonical  
**Applies to:** All agent sessions, channels, automated tasks, and scheduled operations

> **Single source of truth:** `clock.md` and `CLOCK.md` MUST remain identical.

This spec has two layers:
- **Core Clock (MUST):** timezone safety + timestamps (prevents “time blindness”)
- **Temporal Awareness (POLICY-GATED):** “diff matters” prompts + lightweight inference for continuity

Design goal: not perfect prediction — avoid total time blindness and adjust behavior when **5 minutes vs 5 months** have passed, while keeping user control and minimizing invasive storage.

---

## 0. User Policy Block (Editable)

This block defines when CLOCK is consulted (per prompt) and what gets stored. Defaults are intended to be simple and useful.

```yaml
clock:
  enabled: true

  # off: never use time context beyond basic timezone anchoring when needed
  # light: use elapsed-time awareness for continuity; ask before any impactful action
  # normal: more proactive check-ins/summaries when gaps are large
  mode: light  # off | light | normal

  # Track last-message timestamps across channels.
  # IMPORTANT: identity is per-channel by default; linking is optional (see §7.0).
  cross_channel_tracking: true

  # Storage controls
  store:
    last_message_timestamps: true   # always recommended
    latest_actions:
      enabled: true
      max_items: 25
      auto_clock_temporal_actions: true  # store “I’m about to X” style actions automatically
      require_explicit_clock_it_for_non_temporal: true
      store_quotes: false  # if true, store short excerpt; otherwise store normalized summary only

  # When to pause and ask “any updates?” or offer a recap before proceeding
  checkins:
    enabled: true
    rules:
      # Default: if this thread is a project and >= 1 day passed since last interaction, ask for updates.
      - id: project_gap_1d
        when:
          thread_kind: project
          elapsed_gte: P1D
        then:
          ask_for_updates: true

      # If an open/clocked action exists and the user returns after a meaningful gap, allow a hedged continuity reference.
      - id: action_gap_2h
        when:
          has_open_action: true
          elapsed_gte: PT2H
        then:
          allow_hedged_reference: true

      # If it’s been a long time, offer a “quick re-anchor” regardless of kind.
      - id: long_gap_30d
        when:
          elapsed_gte: P30D
        then:
          offer_recap: true

  # Inference is allowed for tone/continuity, never as fact.
  inference:
    enabled: true
    allow_for_tone_only: true
    require_confirmation_for_impactful_actions: true

  # Threshold for treating relative time expressions as ambiguous across time zones
  ambiguity_threshold_hours: 4
```

Policy notes:
- Users can turn off auto-storage and rely only on “clock it”.
- Users can make check-ins more/less frequent by changing ISO 8601 durations (e.g., `P2D`, `PT6H`).
- If policy is missing, agents MUST default to the above block.

---

## 1. Purpose

Prevent timezone-related failures and reduce time blindness by enforcing:
- Explicit timezone anchoring when time is discussed
- Deterministic interpretation of ambiguous time references
- Cross-channel “last interaction” tracking per user and per thread (with optional linking)
- Policy-gated check-ins and bounded inference about “passage of time” effects

An agent that violates Core Clock requirements is not time-safe.

---

## 2. Definitions

**Session TZ** — The timezone in which the current thread should be interpreted.  
**Agent TZ** — The timezone of the host system running the agent.  
**User TZ** — The user’s home/default timezone; may differ from Session TZ during travel.  
**Thread** — A specific conversation context (DM, email thread, group chat, sub-agent run). Identified by a thread key (§7.2).  
**Channel** — A transport surface (chat app, email, terminal, etc.).  
**Floating time** — A time expression without explicit timezone context (“9am”, “tonight”).  
**Latest actions** — Small rolling list of user-relevant temporal actions/events used for continuity and check-ins.  
**Clocked action** — An action stored in Latest actions via explicit “clock it” or policy auto-storage rules.  
**Elapsed** — Time delta between now and a stored timestamp, computed unambiguously (absolute timestamps, DST-aware).  

**Delta hours** — Signed offset difference between Session TZ and Agent TZ.  
- **Delta hours MAY be fractional** (e.g., +5.5, +9.5, +5.75). Implementations SHOULD compare in minutes internally.

---

## 3. Architecture Overview

CLOCK is not “always asked / always surfaced.”

Instead:
- The agent ALWAYS records timestamps (Core Clock).
- The agent decides whether CLOCK is relevant for the current prompt by evaluating the user’s policy rules.
- If not relevant, the agent proceeds normally (no time preamble, no check-in).
- If relevant, the agent may (a) ask for updates, (b) offer a recap anchor, (c) reference an open action in a hedged way.

This avoids spam while preventing time blindness.

---

## 4. Core Clock (MUST)

### 4.1 Always Record Timestamps (Across Channels)

If `clock.store.last_message_timestamps = true`, the agent MUST record:
- last user message timestamp (per user, per thread)
- last agent message timestamp (per thread)
- last interaction timestamp (per thread)
- last interaction across channels (per user) if `cross_channel_tracking = true`

This recording happens even if CLOCK is “not relevant” for a prompt.

### 4.2 Timezone Resolution Protocol (Deterministic)

**Session TZ precedence order (MUST):**
1) Explicit in message (absolute timestamp, “Tokyo time”, “UTC+9”, etc.)
2) Stored session override for this thread
3) User profile default TZ
4) Inferred from mentioned location (unambiguous city/region)
5) Fallback UTC (with explicit notice if time-sensitive)

**Abbreviations (EST/CST/PST):**
- MUST NOT be auto-mapped silently.
- MUST resolve via known user context or ask.

**Agent TZ:**
- Prefer OS timezone; fallback UTC.

**Delta hours:**
- `delta_hours = (SessionTZ offset) - (AgentTZ offset)`, DST-aware.

### 4.3 Floating Time Rule (MUST)

Agents MUST NOT schedule, set reminders, or claim a concrete time from floating time unless anchored to Session TZ and converted to an absolute timestamp.

### 4.4 Timezone Provider (MUST — Implementation Spec)

CLOCK requires a **timezone provider** abstraction so different runtimes (server, mobile node, browser worker) resolve time consistently.

**Interface (minimum):**

- `now(): Instant` → monotonic “current time” snapshot for this decision cycle.
- `agent_timezone(): IANATimezone | "UTC"` → runtime/host timezone.
- `session_timezone(thread_key): IANATimezone | "UTC"` → resolved Session TZ following §4.2 precedence.
- `offset_minutes(tz, instant): int` → DST-aware UTC offset.
- `to_iso(instant, tz): string` → ISO-8601 with offset (e.g., `2026-02-10T12:02:00+09:00`).
- `parse_anchored_time(text, tz, reference_instant): ParseResult` → parses *anchored* times only.

**Hard rules:**
- MUST use IANA TZ IDs internally (`Asia/Tokyo`), not abbreviations.
- MUST be DST-aware when computing offsets and conversions.
- MUST treat “floating time” as *unparseable* unless caller provides a Session TZ anchor (§4.3).

**ParseResult (suggested):**
- `kind: "absolute" | "relative" | "floating" | "invalid"`
- `start_instant?: Instant`
- `end_instant?: Instant`
- `needs_clarification?: boolean`
- `clarification_question?: string`

### 4.5 Interaction Wrapper (MUST — Integration Spec)

CLOCK also requires an **interaction wrapper** that sits at the edge of each channel/thread and performs timestamp bookkeeping *even when Temporal Awareness is OFF*.

**Responsibilities (minimum):**
1) Generate stable identifiers:
   - `user_key` (channel-scoped unless explicitly linked; §7)
   - `thread_key` (DM thread, group+topic, email thread id, etc.)
2) On inbound user message:
   - record `last_user_message_iso` (thread)
   - record `last_interaction_iso` (thread)
   - if `cross_channel_tracking=true`, also record `last_interaction_any_channel_iso` (user)
3) On outbound agent message:
   - record `last_agent_message_iso` (thread)
   - record `last_interaction_iso` (thread)

**Suggested wrapper API:**
- `on_user_message({channel, thread_id, user_id, received_at?, text}) -> ContextEnvelope`
- `on_agent_message({channel, thread_id, sent_at?, text, relates_to_user_id?}) -> void`
- `load_clock_state(user_key, thread_key) -> ClockState`
- `save_clock_state(user_key, thread_key, patch) -> void`

**Why this matters:** it prevents “time blindness” when the LLM prompt doesn’t mention time, because the wrapper updates state out-of-band.

---

## 5. Temporal Awareness (POLICY-GATED)

Temporal awareness activates only when policy says it matters.

### 5.1 Clock Relevance Decision (Per Prompt)

On each user message, compute:
- `thread_kind` (stored on thread; can be inferred or explicitly set)
- `elapsed_since_last_interaction` (thread)
- `elapsed_since_last_interaction_any_channel` (user, optional)
- `has_open_action` (per user and/or per thread)
- whether message contains time references or scheduling intent
- whether user used explicit clock directive (“clock it”, “clock:”)

Decision:
- If `clock.enabled = false` → skip Temporal Awareness (but still enforce timezone anchoring when needed)
- Else evaluate check-in rules in order; if any rule triggers → Temporal Awareness ON
- Else if message is time/scheduling-related → Temporal Awareness ON
- Else Temporal Awareness OFF

### 5.2 Thread Kind

Allowed values (minimum):
- `project`
- `conversation`
- `scheduling`
- `operations`

Setting `thread_kind`:
- User can set explicitly: `clock: kind project`
- Agent MAY infer from context, but SHOULD persist only if confident or user-confirmed.
- Default if unknown: `conversation`.

---

## 6. Latest Actions (Clocked Actions)

### 6.1 What Latest Actions Are For

Latest actions provide light continuity over time:
- “Last time you said you were heading to the gym — how’d it go?”
- “You said you’d call the bank — did you manage it?”

They are NOT a full timeline and NOT a task manager.

### 6.2 How Actions Get Stored

Two ways:

A) **Explicit directive (highest priority)**
- `clock it: I’m going to eat dinner`
- `clock: paid invoice`
- `clock it` appended to a message with a clear action

B) **Auto-store temporal actions** (only if enabled by policy)
If `auto_clock_temporal_actions = true`, the agent MAY store actions that:
- imply near-term temporal relevance (“about to…”, “heading to…”, “going to sleep”, “brb”, “after X I will…”) and/or
- help interpret later follow-ups

If `require_explicit_clock_it_for_non_temporal = true`, do NOT store non-temporal items unless explicitly clocked.

### 6.3 Minimal Storage Principle

For each action store:
- normalized label (short summary)
- timestamps (`recorded_iso`, `expires_iso`/ttl)
- status (`planned`/`in_progress`/`likely_done`/`done`/`canceled`/`expired`)
- scope (`user_id`, `thread_key`)
- optional: expected duration (from templates or per-user calibration)

Avoid storing long text by default (`store_quotes: false`).

### 6.4 Action Expiry

All actions MUST expire.
Default TTL guidance:
- planned/in_progress: 24h unless user provides longer horizon
- project actions: 7–30 days depending on `thread_kind` and policy

Expired actions should not be used for strong continuity claims.

---

## 6.5 Temporal Action Inference (Bounded, Practical)

This section clarifies the intended “thread inference” behavior without turning Latest Actions into a full task manager.

**Sleep actions**
- If the user says **“going to sleep”** (or equivalent), the agent MAY store a short-lived open action (TTL ~8–12h).
- If the user returns later, the agent MAY say something like: “Welcome back — did you end up getting some sleep?” (hedged).

**Future specific actions → plausible completion cues**
- If the user declares a **future specific action** with a plausible duration (explicit or from calibration), the agent MAY:
  - treat it as open for that duration window
  - later, if the user references an emotion or activity that could reasonably be explained by that action, ask a *confirming* question.

Examples:
- “I’m headed to the gym” (expected ~2h) → later “I’m sore” → “Tough workout — did you end up going to the gym?”
- “I’m going to chug 2 gallons of milk” → later “My stomach hurts” → “Did you actually chug the milk? That would explain it.”

**Hard rule:** these are prompts for confirmation, never treated as fact.

---

## 7. Cross-Channel & Multi-User Requirements

### 7.0 Identity Model (Per-channel by default; optional linking)

Default behavior:
- Users are **distinct per channel** (e.g., WhatsApp Ryan ≠ Telegram Ryan) unless explicitly linked.

Optional linking:
- Implementations MAY support linking identities across channels (manual, user-approved).
- When linked, cross-channel timestamps and Latest Actions MAY be used for continuity **under the same user policy**.

### 7.2 Thread Key Definition (MUST)

Thread key MUST uniquely identify:
- agent identity
- channel
- thread

Examples:
- `agent:main:chat:dm:<user_id>`
- `agent:main:email:<thread_id>`
- `agent:main:telegram:group:<chat_id>`
- `agent:main:subagent:<uuid>`

### 7.3 Multi-User Group Chats

There is no single user timezone.
Rules:
- Store per-user User TZ when known.
- **Presentation timezone is per user** (when addressing a user, prefer their TZ labeling).
- For group scheduling, store absolute timestamps and present:
  - UTC + conversions for mentioned participants where relevant.
- Latest actions are per-user, not “for the whole group,” unless explicitly clocked as group-relevant.

---

## 8. Temporal Inference (Allowed, but Bounded)

Philosophy: total time blindness guarantees errors. Inference will sometimes be wrong; that is acceptable for continuity and tone. It is not acceptable for high-impact actions without confirmation.

### 8.1 Inference Scope

Inference MAY influence:
- phrasing (“welcome back”, “hope dinner went well”)
- whether to ask for updates before continuing
- whether to re-anchor context after long gaps

Inference MUST NOT:
- be stated as fact unless user confirms
- trigger external actions (messages to others, purchases, irreversible writes) without confirmation

### 8.2 “Impactful action” (examples, non-exhaustive)

If `require_confirmation_for_impactful_actions = true`, confirmation is required before:
- sending messages/emails to third parties
- creating/modifying calendar events or reminders
- executing purchases/financial actions
- publishing/deploying public changes
- deleting data

---

## 9. Check-Ins (“Diff matters”) Behavior

If a check-in rule triggers, the agent SHOULD do one of:
- Ask for updates (default for projects)
- Offer recap anchor (default for very long gaps)
- Reference open action (hedged, if allowed)

The agent SHOULD NOT spam elapsed-time callouts if the user doesn’t benefit.

---

## 10. State Management

### 10.1 CLOCK-STATE.json Location
Default:
- `~/.openclaw/clock-state.json`

### 10.2 Schema (Version 3)
```json
{
  "version": 3,
  "users": {
    "<user_id>": {
      "default_tz": "Asia/Tokyo",
      "policy_overrides": {
        "mode": "light"
      },
      "last_interaction_any_channel_iso": "2026-02-09T10:00:00+09:00",
      "channels": {
        "<channel_key>": {
          "last_user_message_iso": "2026-02-09T10:00:00+09:00",
          "last_agent_message_iso": "2026-02-09T10:00:05+09:00"
        }
      },
      "latest_actions": [
        {
          "id": "act_9f3c",
          "label": "Eat dinner",
          "type": "temporal_action",
          "status": "planned",
          "recorded_iso": "2026-02-09T18:10:00+09:00",
          "expected_typical_minutes": 75,
          "expected_max_minutes": 180,
          "expires_iso": "2026-02-10T18:10:00+09:00",
          "thread_key": "agent:main:chat:dm:<user_id>",
          "source": "auto|clock_it|user_confirmed"
        }
      ],
      "calibration": {
        "activity_overrides": {
          "meal:dinner": {
            "typical_minutes": 90,
            "max_minutes": 240,
            "updated_iso": "2026-02-01T12:00:00+09:00"
          }
        }
      }
    }
  },
  "threads": {
    "<thread_key>": {
      "thread_kind": "project|conversation|scheduling|operations",
      "session_tz": "Asia/Tokyo",
      "agent_tz": "Europe/Berlin",
      "delta_hours": 8,
      "participants": ["<user_id>", "<user_id_2>"],
      "last_interaction_iso": "2026-02-09T10:00:05+09:00",
      "last_user_message_iso_by_user": {
        "<user_id>": "2026-02-09T10:00:00+09:00"
      }
    }
  }
}
```

### 10.3 Operations
- Read: session start / before policy evaluation
- Update: after each substantive response
- Compact: prune actions older than expiry; cap `latest_actions` length

**Substantive response (definition):** any agent message that (a) provides instructions/answers/decisions, (b) schedules/commits to next steps, or (c) performs or proposes an action. Pure acknowledgements (“ok”, “got it”) SHOULD NOT trigger a write.

**Concurrency requirement (MUST):** state updates MUST be atomic (write temp file + rename) and MUST use a lock (or equivalent) to avoid concurrent write corruption.

---

## 11. Output Formatting Rules

When presenting time:
- Prefer Session TZ labeling (“Tokyo time”)
- For scheduling: include absolute timestamps
- For group chats: use UTC + per-user conversions where relevant

When referencing inferred action completion:
- MUST hedge (“if”, “sounds like”, “hope”)
- MUST be willing to be corrected immediately

---

## 12. Compliance Checklist

Core Clock (MUST):
- Resolve Session TZ via precedence order
- Anchor floating times before scheduling
- Record last-message timestamps per user/thread; across channels if enabled

Temporal Awareness (Policy):
- Evaluate user rules per prompt to decide whether CLOCK matters
- If project gap ≥ threshold: ask for updates before continuing
- Store latest actions via “clock it” and/or auto temporal action policy
- Keep per-user calibration and multi-user support
- Never treat inference as fact; confirm before impactful actions
