# ClickBot PoC → v2 Consolidation Review

**Verdict:** the draft is a good *interaction skeleton* but architecturally it is an **open-loop coordinate clicker**. The state of the art in 2025/26 is **closed-loop, semantically anchored, replayable, and auditable**. Your PoC currently has no post-condition verification, no element identity, no cancellation model, and evidence that would not survive a Part 11 audit — which is precisely the gap your MedTech background makes non-negotiable.

Four axes to consolidate: **Targeting · Control loop · Evidence · Operability**.

---

## 1. Gap analysis vs. state of the art

| Axis | PoC today | State of the art | Priority |
| --- | --- | --- | --- |
| Targeting | Absolute screen pixels only | Locator ladder: accessibility tree / DOM → visual template+OCR → model grounding → coords as *last resort* | **P0** |
| Waiting | `time.sleep(fixed)` | Auto-wait + web-first assertions (Playwright), condition polling with deadline | **P0** |
| Verification | None — "success rate" is unmeasurable | Post-condition predicate per action (`assert_visual` / `assert_dom` / `assert_ocr`) | **P0** |
| Control flow | Blocking `while` loop | Async FSM, `CancellationToken`, bounded event queue, backpressure | **P0** |
| Evidence | Mutable PNG + local-time filename | Hash-chained append-only JSONL, UTC + monotonic clock, signed manifest, WORM retention | **P0** (your domain) |
| Idempotency | None | Idempotency key per step + dedupe store → safe replay/retry | P1 |
| Safety | `FAILSAFE` implicit, no kill listener | Dead-man switch, geofence re-validation, window/PID allowlist, focus-loss abort, rate limiter | **P0** |
| API security | Local FastAPI, unspecified auth | Loopback bind + bearer token + `Origin`/`Host` validation (DNS-rebinding/CSRF) | **P0** |
| Privacy | Full-screen capture, unredacted | Region-scoped capture + OCR-based PII redaction before persist, encryption at rest | **P0** (GxP) |
| Platform | `pygetwindow` (Windows-only), `keyboard` (root on Linux) | Per-OS backends: UIA/`SendInput`/DXGI · AX/`CGEvent`/ScreenCaptureKit · AT-SPI/XTest or **Wayland portals + libei** | P1 |
| Determinism | Unseeded `random` | Seeded PRNG, seed in manifest → bit-reproducible replay | P1 |
| Testability | One `test_clicker.py` | Fake input backend, virtual clock, Hypothesis invariants, SSIM golden images, `pytest-bdd` | P1 |
| Observability | `rich` prints | OpenTelemetry spans/metrics, `traceparent` propagated to UI | P2 |
| Agentic | — | MCP server exposure + human-in-the-loop approval gates | P2 |
| Packaging | `requirements.txt` with unused deps | `pyproject.toml` + extras + lockfile + ruff/mypy/pre-commit | P1 |

**Reference points worth aligning to:** Playwright (locators, auto-wait, trace viewer, `playwright-mcp` accessibility-tree driving), Selenium 4 WebDriver BiDi, OS accessibility APIs (UIAutomation / AXUIElement / AT-SPI2), `xdg-desktop-portal` RemoteDesktop+ScreenCast with `libei` for Wayland, `dxcam`/`mss`/ScreenCaptureKit for capture throughput, OmniParser/UI-TARS-class grounding models as an *optional* L3 resolver, and MCP as the agent-facing contract.

---

## 2. Concrete defects in the draft snippet

| # | Defect | Impact | Fix |
| --- | --- | --- | --- |
| 1 | `random.randint(left, left + width)` | Inclusive upper bound → clicks **1 px outside** the ROI (and on the neighbouring control) | Half-open `[left, left+width)` via `randrange` |
| 2 | `cv2.selectROI` cancel returns `(0,0,0,0)` | Zero-area region → degenerate clicks, silent no-op | Reject `w<=0 or h<=0`, raise `RegionError` |
| 3 | `f"{timestamp}_{label}.png"` with unsanitised `label` | Path traversal (`label="../../x"`) | Slugify + allowlist `[A-Za-z0-9_-]` |
| 4 | `datetime.now()` (naive local) | Non-UTC, DST-ambiguous → breaks ALCOA+ *Contemporaneous* | UTC + `time.monotonic_ns()` + per-run sequence |
| 5 | `windows[0]` from `getWindowsAt` | May be an invisible/overlay/child window; no DPI normalisation | Filter visible+enabled, resolve to owning PID, per-monitor-v2 DPI |
| 6 | Region never re-anchored | Window moves/resizes/scrolls → clicks land on wrong UI | Re-validate geofence + re-anchor each action |
| 7 | `keyboard.wait(...)` no timeout, needs root, dead on Wayland | Hangs forever; unusable in CI | `pynput` / portal GlobalShortcuts + timeout + cancel |
| 8 | `pag.FAILSAFE`/`PAUSE` never set | No enforced abort path | Explicit config + independent kill event |
| 9 | Full-screen capture per action | ~50–150 ms/action + captures unrelated PII | Region capture via `mss`/`dxcam` |
| 10 | No post-click assertion | Logs "success" for failures | Mandatory verify step |
| 11 | `numpy` implicit, `pandas`/`selenium` unused, `fastapi`/`uvicorn`/`pydantic`/`pyyaml`/`mss` **missing** | Spec ≠ manifest | `pyproject.toml` + extras |
| 12 | Mutable PNGs, no hash/signature | Fails 21 CFR §11.10(e) audit-trail integrity | Hash chain + signed manifest |

---

## 3. Consolidated architecture (v2)

```
┌──────────────────────────────────────────────────────────────┐
│  Vite/React Builder  ·  MCP client (agent)  ·  CLI           │
└───────────────┬──────────────────────────────────────────────┘
                │ loopback HTTP+WS (token, Origin-checked)
┌───────────────▼──────────────────────────────────────────────┐
│  api.py — thin transport, no business logic                  │
├──────────────────────────────────────────────────────────────┤
│  engine.py — async FSM · cancel · retry · idempotency        │
│    IDLE→RESOLVE→PRE→ACT→VERIFY→POST→DONE                     │
│                    └─fail→RECOVER→(retry|ABORT)              │
├──────────────┬───────────────┬───────────────┬───────────────┤
│ resolver/    │ backends/     │ safety.py     │ evidence.py   │
│ L1 semantic  │ pyautogui     │ geofence      │ hash-chained  │
│ L2 visual    │ playwright    │ allowlist     │ JSONL+manifest│
│ L3 grounded  │ enigo (Rust)  │ kill switch   │ redaction     │
│ L4 coords    │ fake (tests)  │ rate limit    │ encryption    │
└──────────────┴───────────────┴───────────────┴───────────────┘
```

**The locator ladder** — every action declares intent, not pixels. Resolution returns `{rect, confidence, strategy, provenance}` and *all four are written to evidence*, so an auditor can see **why** the bot clicked where it clicked.

```yaml
target:
  semantic: { role: button, name: "Submit", engine: playwright }   # L1 preferred
  visual:   { template: "assets/tpl/submit.png", threshold: 0.92 } # L2 fallback
  coords:   { left: 450, top: 320, width: 80, height: 30 }         # L4 last resort
verify:
  kind: visual_change      # or: dom_text | ocr_contains | template_present
  timeout_s: 8.0
```

---

## 4. Canonical schema v2 (excerpt)

```json
{
  "schema_version": "2.0",
  "job_id": "job_qa_smoke_submit",
  "seed": 20261118,
  "target_allowlist": [{ "pid": 4821, "title_regex": "^MyApp — QA$" }],
  "coordinate_space": "physical_px_virtual_desktop",
  "steps": [
    { "id": "s1", "action": "screenshot", "scope": "target_window", "redact": true },
    { "id": "s2", "action": "click",
      "target": { "semantic": {"role":"button","name":"Submit"},
                  "visual": {"template":"assets/tpl/submit.png","threshold":0.92} },
      "jitter_px": 3, "button": "left",
      "idempotency_key": "s2:{run_id}",
      "retry": { "max_attempts": 3, "backoff_s": [0.5, 4.0] },
      "verify": { "kind": "visual_change", "min_ssim_delta": 0.02, "timeout_s": 8 } },
    { "id": "s3", "action": "assert", "kind": "ocr_contains", "text": "Submitted" }
  ],
  "on_failure": "abort_and_capture"
}
```

Pydantic v2 discriminated union + `serde` tagged enum on the Rust side → **one contract, two runtimes**, generated from a single JSON Schema.

---

## 5. Reference implementation (core fixes)

### 5.1 Geometry + safety envelope

```python
# src/geometry.py
from __future__ import annotations
import random, re
from dataclasses import dataclass

class RegionError(ValueError): ...

_SLUG = re.compile(r"[^A-Za-z0-9_-]+")
def slug(label: str) -> str:
    s = _SLUG.sub("_", label).strip("_")[:64]
    if not s: raise RegionError("empty label")
    return s

@dataclass(frozen=True, slots=True)
class Region:
    """Half-open [left, right) x [top, bottom) in physical pixels."""
    left: int; top: int; width: int; height: int

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise RegionError(f"degenerate region: {self}")

    @property
    def right(self) -> int: return self.left + self.width
    @property
    def bottom(self) -> int: return self.top + self.height

    def sample(self, rng: random.Random, jitter: int = 0) -> tuple[int, int]:
        # inset keeps jitter inside the box; fixes draft off-by-one
        x0, x1 = self.left + jitter, self.right - jitter
        y0, y1 = self.top + jitter, self.bottom - jitter
        if x1 <= x0 or y1 <= y0:
            x0, x1, y0, y1 = self.left, self.right, self.top, self.bottom
        return rng.randrange(x0, x1), rng.randrange(y0, y1)

    def contained_in(self, bounds: "Region") -> bool:
        return (self.left >= bounds.left and self.top >= bounds.top
                and self.right <= bounds.right and self.bottom <= bounds.bottom)
```

```python
# src/safety.py
import asyncio, time
from dataclasses import dataclass, field

class SafetyViolation(RuntimeError): ...

@dataclass
class SafetyEnvelope:
    allowed_pids: frozenset[int]
    geofence: Region
    max_actions_per_min: int = 120
    kill: asyncio.Event = field(default_factory=asyncio.Event)
    _stamps: list[float] = field(default_factory=list)

    def precheck(self, *, pid: int, foreground_pid: int,
                 window_bounds: Region, action_region: Region) -> None:
        if self.kill.is_set():                       raise SafetyViolation("kill switch")
        if pid not in self.allowed_pids:             raise SafetyViolation(f"pid {pid} not allowlisted")
        if foreground_pid != pid:                    raise SafetyViolation("target lost focus")
        if not action_region.contained_in(window_bounds):
            raise SafetyViolation("region escaped window bounds (moved/resized?)")
        if not window_bounds.contained_in(self.geofence):
            raise SafetyViolation("window escaped geofence")
        now = time.monotonic()
        self._stamps = [t for t in self._stamps if now - t < 60.0]
        if len(self._stamps) >= self.max_actions_per_min:
            raise SafetyViolation("rate limit")
        self._stamps.append(now)
```

### 5.2 Tamper-evident evidence (ALCOA+ / Part 11)

```python
# src/evidence.py
import hashlib, json, os, time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

def _canon(o: Any) -> bytes:
    return json.dumps(o, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()

class EvidenceWriter:
    """Append-only, hash-chained event log + signed run manifest."""

    def __init__(self, run_dir: Path, actor: str, run_id: str):
        self.dir = run_dir; self.dir.mkdir(parents=True, exist_ok=True)
        self.actor, self.run_id = actor, run_id
        self._log = (self.dir / "events.jsonl").open("ab", buffering=0)
        self._head = "0" * 64
        self._seq = 0
        self._t0 = time.monotonic_ns()

    def record(self, kind: str, payload: dict, artifact: Path | None = None) -> dict:
        rec = {
            "seq": self._seq,
            "run_id": self.run_id,
            "actor": self.actor,                                  # Attributable
            "utc": datetime.now(timezone.utc).isoformat(timespec="microseconds"),
            "mono_ns": time.monotonic_ns() - self._t0,             # Contemporaneous, monotonic
            "kind": kind,
            "payload": payload,
            "artifact_sha256": self._sha(artifact) if artifact else None,
            "prev_hash": self._head,
        }
        rec["hash"] = hashlib.sha256(self._head.encode() + _canon(rec)).hexdigest()
        self._log.write(_canon(rec) + b"\n")
        os.fsync(self._log.fileno())                               # Enduring
        self._head, self._seq = rec["hash"], self._seq + 1
        return rec

    @staticmethod
    def _sha(p: Path) -> str:
        h = hashlib.sha256()
        with p.open("rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
        return h.hexdigest()

    def close(self, outcome: str) -> Path:
        self._log.close()
        manifest = {"run_id": self.run_id, "actor": self.actor,
                    "root_hash": self._head, "events": self._seq, "outcome": outcome}
        p = self.dir / "manifest.json"
        p.write_bytes(_canon(manifest))
        return p   # → sign with cosign/minisign; ship to S3 Object Lock (WORM)

def verify_chain(path: Path) -> bool:
    head = "0" * 64
    for line in path.read_text().splitlines():
        rec = json.loads(line)
        claimed = rec.pop("hash")
        if rec["prev_hash"] != head: return False
        if hashlib.sha256(head.encode() + _canon(rec)).hexdigest() != claimed: return False
        head = claimed
    return True
```

> **ALCOA+ mapping:** Attributable→`actor` · Legible→canonical JSON · Contemporaneous→UTC+monotonic · Original→artifact SHA-256 · Accurate→verify-step result · Complete→seq gap detection · Consistent→single schema · Enduring→`fsync`+WORM · Available→manifest index.
> Sign manifests (Sigstore/`minisign`), anchor periodically (RFC 3161), and enforce retention via object lock — not filesystem permissions.

### 5.3 Closed-loop async engine

```python
# src/engine.py (core)
import asyncio, random, time
from typing import Protocol

class InputBackend(Protocol):
    async def click(self, x: int, y: int, button: str) -> None: ...
    async def capture(self, region: Region | None) -> "Image": ...

class Resolver(Protocol):
    async def resolve(self, target: Target) -> Resolution: ...  # rect+confidence+strategy

class RunContext:
    def __init__(self, run_id, ev: EvidenceWriter, safety: SafetyEnvelope,
                 rng: random.Random, backend: InputBackend, resolver: Resolver,
                 events: asyncio.Queue):
        self.run_id, self.ev, self.safety = run_id, ev, safety
        self.rng, self.backend, self.resolver = rng, backend, resolver
        self.events = events            # bounded → backpressure, never drop evidence

async def exec_click(step: ClickStep, ctx: RunContext) -> StepResult:
    deadline = time.monotonic() + step.timeout_s
    attempt = 0
    while True:
        attempt += 1
        if ctx.safety.kill.is_set(): raise asyncio.CancelledError
        try:
            res = await ctx.resolver.resolve(step.target)          # L1→L2→L3→L4
            region = res.rect
            ctx.safety.precheck(pid=res.pid, foreground_pid=await foreground_pid(),
                                window_bounds=res.window_bounds, action_region=region)

            pre = await ctx.backend.capture(res.window_bounds)
            pre_p = persist_redacted(pre, ctx, f"{step.id}_pre")
            ctx.ev.record("pre_capture", {"step": step.id, "resolution": res.model_dump()}, pre_p)

            x, y = region.sample(ctx.rng, step.jitter_px)
            await ctx.backend.click(x, y, step.button)
            ctx.ev.record("act", {"step": step.id, "x": x, "y": y,
                                  "strategy": res.strategy, "confidence": res.confidence,
                                  "attempt": attempt, "seed": ctx.rng_seed})

            ok, detail = await wait_verify(step.verify, ctx, pre, deadline)   # auto-wait
            post = await ctx.backend.capture(res.window_bounds)
            post_p = persist_redacted(post, ctx, f"{step.id}_post")
            ctx.ev.record("verify", {"step": step.id, "passed": ok, **detail}, post_p)

            if ok: return StepResult(step.id, "passed", attempt)
            raise VerificationFailed(detail)

        except (VerificationFailed, TransientResolutionError) as e:
            if attempt >= step.retry.max_attempts or time.monotonic() > deadline:
                ctx.ev.record("step_failed", {"step": step.id, "error": repr(e)})
                raise
            lo, hi = step.retry.backoff_s
            await asyncio.sleep(ctx.rng.uniform(lo, hi))            # seeded → replayable
```

Key deltas from the draft: **deadline-driven polling instead of fixed sleeps**, **mandatory verify**, **seeded PRNG recorded for replay**, **safety re-check per attempt**, **cancellation honoured at every await**, **evidence written even on failure**.

### 5.4 Hardened loopback API

```python
# src/api.py
import secrets
from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket

TOKEN = secrets.token_urlsafe(32)          # printed once; UI reads from launch handshake
ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}

async def guard(request: Request):
    if request.headers.get("authorization") != f"Bearer {TOKEN}":
        raise HTTPException(401)
    origin = request.headers.get("origin")
    if origin is not None and origin not in ALLOWED_ORIGINS:
        raise HTTPException(403, "origin rejected")     # blocks DNS-rebinding / drive-by CSRF
    host = request.headers.get("host", "")
    if host.split(":")[0] not in {"127.0.0.1", "localhost"}:
        raise HTTPException(403, "host rejected")

app = FastAPI(dependencies=[Depends(guard)])
# uvicorn.run(app, host="127.0.0.1", port=8765)  — never 0.0.0.0, no CORS wildcard
```

Without this, **any webpage open in the user's browser could drive their mouse**. That is the single most severe issue in the current design.

---

## 6. Shift-left test strategy

```gherkin
Feature: Bounded, verifiable clicking
  Scenario: Jitter never escapes the region
    Given a region 100,100 80x30 and seed 42
    When I sample 10000 click points with jitter 3
    Then every point lies within [100,180) x [100,130)

  Scenario: Window moves mid-run
    Given a hooked window at 0,0 800x600
    And the action region is 450,320 80x30
    When the window moves to 900,0 before the click
    Then the engine raises SafetyViolation
    And no input event is emitted
    And the evidence chain remains verifiable

  Scenario: Unverified click is never reported as success
    Given the post-condition template is absent
    When the click step executes
    Then the step is retried up to 3 times
    And the outcome is "failed" with a post-capture artifact
```

```python
@given(st.integers(), st.integers(), st.integers(1, 4000), st.integers(1, 4000), st.integers(0, 50))
def test_sample_in_bounds(l, t, w, h, j):
    r = Region(l, t, w, h)
    x, y = r.sample(random.Random(0), j)
    assert r.left <= x < r.right and r.top <= y < r.bottom
```

- **Fake backend** records intents → full engine coverage with zero real input, runs headless in CI.
- **Virtual clock** → 8 s timeouts tested in microseconds.
- **Golden images** with SSIM tolerance instead of byte equality (font hinting/AA drift).
- **CI matrix:** `ubuntu-latest` + Xvfb (X11 path), `windows-latest` (interactive session — note Session 0 isolation and RDP-disconnect lock will kill UI automation; use a persistent console session or Tscon redirect), `macos-latest` with TCC pre-grants.
- **Chaos:** inject focus loss, window move, DPI change, power-loss mid-write → assert chain still verifies (your async-state-machine edge-case playbook, applied here).

---

## 7. Rust core path (recommended hardening phase)

Given your tokio/serde/actix-web trajectory, the natural split is **schema-first, two runtimes**:

| Concern | Python (PoC velocity) | Rust core (`clickbotd`) |
| --- | --- | --- |
| Input | pyautogui | `enigo` / `windows` `SendInput` / `atspi`+`libei` |
| Capture | `mss`/`dxcam` | `xcap`, DXGI / ScreenCaptureKit |
| Hotkeys | `pynput` | `rdev` / portal GlobalShortcuts |
| Engine | asyncio | `tokio` + `CancellationToken`, typed FSM |
| API | FastAPI | `axum`/`actix-web` + WS |
| Contract | pydantic v2 | `serde` tagged enum, **generated from same JSON Schema** |
| Evidence | hashlib | `sha2` + `sqlx` append-only ledger |

```rust
#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
pub enum Step {
    Screenshot { id: String, scope: Scope, redact: bool },
    Click { id: String, target: Target, jitter_px: u32,
            retry: Retry, verify: Verify, idempotency_key: Option<String> },
    Wait { id: String, duration_range: (f64, f64) },
    Assert { id: String, kind: AssertKind },
}

// typed FSM: illegal transitions become compile errors
struct Running<S> { ctx: Arc<Ctx>, _state: PhantomData<S> }
impl Running<Acting> {
    async fn verify(self) -> Result<Running<Verifying>, Abort> { /* ... */ }
}
```

Ship it as a single static binary with the Vite build embedded (`rust-embed`) — no Python runtime on validated machines, which materially simplifies your IQ/OQ footprint. Expose Python actions via PyO3 for the ML/vision layer rather than rewriting OpenCV plumbing.

---

## 8. Agentic extension (optional L3)

- Expose the engine as an **MCP server**: `hook_target`, `resolve_target`, `click`, `assert`, `read_evidence` — with a **human approval gate** on any state-mutating tool. This is the concrete instantiation of your *Agentic Mesh* thesis in a regulated setting: autonomy bounded by a capability envelope, every action attributable and hash-chained.
- Grounding models (OmniParser-class screen parsing, UI-TARS/CUA-class planners) belong **strictly at L3**: propose a rect, never emit input directly. The safety envelope and verify step remain deterministic gatekeepers. Record `model_id`, `prompt_hash`, `confidence` in evidence — otherwise the audit trail has an unexplainable decision in it.

---

## 9. Scope guardrails (design constraint, not boilerplate)

Two items in the draft read as anti-detection rather than automation, and they change the risk class of the tool:

- **"Human-like delays" + the `job_daily_checkin` example.** Randomised timing to evade bot detection on third-party services is out of scope. Reframe jitter as **seeded, reproducible input fuzzing** for first-party UI testing — same code, defensible purpose, replayable.
- **Enforce it in code:** the `target_allowlist` (PID/origin) is mandatory, not optional; no CAPTCHA solving, no credential replay, no proxy/指纹 rotation hooks. Prefer an official API or Playwright against a first-party app whenever one exists — pixel automation is the fallback, not the default.

This keeps ClickBot squarely in QA/RPA/accessibility/regulated-evidence territory, which is where it is genuinely differentiated.

---

## 10. Consolidated roadmap

| Phase | Deliverable | Acceptance criteria |
| --- | --- | --- |
| **P0 — Correctness** | `geometry`, `safety`, hash-chained `evidence`, verify step, loopback auth | 12 defects closed; `verify_chain()` passes after injected crash; no click outside ROI in 10⁶ Hypothesis samples |
| **P1 — Closed loop** | Locator ladder L1/L2, async FSM, retry+idempotency, seeded replay | Same seed + same event log → identical action sequence; ≥95% step success on a moved/resized window fixture |
| **P2 — Compliance** | Redaction, encryption at rest, signed manifest, WORM export, IQ/OQ docs | Part 11 §11.10(e)/§11.50 control matrix traced to automated Gherkin evidence |
| **P3 — Cross-platform** | Wayland portal+libei, macOS AX/SCK, Windows UIA+DXGI | CI green on 3 OSes; ≥60 fps region capture; per-monitor-v2 DPI correct on mixed-scale setup |
| **P4 — Rust core** | `clickbotd` static binary, schema-generated contracts | Byte-identical event logs vs Python reference on the conformance corpus |
| **P5 — Agentic** | MCP server + approval gates + L3 grounding | Every model-proposed action gated, attributable, and replayable |

**Manifest consolidation:**

```toml
[project]
requires-python = ">=3.11"
dependencies = ["pydantic>=2.7", "mss>=9.0", "pillow>=10.3", "rich>=13.7",
                "pynput>=1.7", "pyyaml>=6.0", "numpy>=1.26"]

[project.optional-dependencies]
windows = ["pyautogui>=0.9.54", "pywinauto>=0.6.8", "dxcam>=0.0.5"]
web     = ["playwright>=1.45"]
vision  = ["opencv-python-headless>=4.10", "rapidocr-onnxruntime>=1.3"]
api     = ["fastapi>=0.111", "uvicorn[standard]>=0.30"]
dev     = ["pytest>=8", "pytest-bdd>=7", "hypothesis>=6.100",
           "pytest-asyncio>=0.23", "ruff>=0.5", "mypy>=1.10", "syrupy>=4"]
```

Drop `pandas`/`selenium` from core (unused in the draft; Playwright supersedes Selenium here), add the missing `fastapi`/`uvicorn`/`pydantic`/`pyyaml`/`mss`, and make `numpy` explicit.

---

**The one-sentence consolidation:** move ClickBot from *"click randomised pixels and photograph the screen"* to *"resolve intent through a locator ladder, act inside a capability envelope, verify the post-condition, and emit a tamper-evident, replayable record"* — that is both the state of the art and the only version of this tool that is deployable in a GxP environment.

Want me to generate the full P0 drop next (`geometry.py`, `safety.py`, `evidence.py`, `engine.py`, fake backend, Gherkin suite, CI workflow) as ready-to-commit files?

---
