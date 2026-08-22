# FastMCP Apps and Prefab Overlay — Architecture Reference

This document explains how FastMCP Apps, Prefab overlays, and the sandboxed iframe bridge work across all three zones. It is written for developers who are new to this system and need to understand the full picture before touching any of these layers.

Cross-references:
- [ADR-0028](../../SovereignAgenticArchitectureZoneOne/docs/adr/0028-prefab-renderer-sandboxed-iframe-over-native-react-components.md) — sandboxed iframe decision record
- [confirmation-and-overlay-integration.md](../../SovereignAgenticArchitectureZoneOne/docs/dev/confirmation-and-overlay-integration.md) — cross-zone integration contract

---

## Contents

1. [What problem this solves](#1-what-problem-this-solves)
2. [Three-zone call map](#2-three-zone-call-map)
3. [FastMCP Apps — Zone 2 overlay builder](#3-fastmcp-apps--zone-2-overlay-builder)
4. [The governed result envelope](#4-the-governed-result-envelope)
5. [Zone 1 rendering pipeline](#5-zone-1-rendering-pipeline)
6. [The sandboxed iframe](#6-the-sandboxed-iframe)
7. [Two-layer postMessage protocol](#7-two-layer-postmessage-protocol)
8. [The toolCall bridge — full call flow](#8-the-toolcall-bridge--full-call-flow)
9. [App instance lifecycle](#9-app-instance-lifecycle)
10. [`app_session_id` — full lifecycle](#10-app_session_id--full-lifecycle)
11. [Sidecar endpoints](#11-sidecar-endpoints)
12. [Tauri commands](#12-tauri-commands)
13. [`RuntimeTransport` — the abstraction boundary](#13-runtimetransport--the-abstraction-boundary)
14. [Adding a new capability with an overlay](#14-adding-a-new-capability-with-an-overlay)
15. [When to escalate beyond sandboxed iframe](#15-when-to-escalate-beyond-sandboxed-iframe)
16. [TUI fallback](#16-tui-fallback)
17. [Version pinning](#17-version-pinning)
18. [File index](#file-index)

---

## 1. What problem this solves

Zone 2 capabilities return governed data (records, search results, paginated lists). A plain text response works for the model, but a human user benefits from a structured visual. Zone 1's desktop must render these views **without knowing what they contain**.

The constraint is strict: Zone 1 must not import Zone 2 source code, reproduce Zone 2 domain vocabulary, or contain any capability-specific rendering logic. A new Zone 2 capability with a completely different visual layout must require **zero Zone 1 code changes**.

The solution is two layered systems:

- **FastMCP Apps** (Zone 2): a governed overlay builder that packages governed data into a generic `PrefabApp` tree
- **Prefab renderer** (Zone 1 desktop): a sandboxed iframe running the `prefab_ui` bundle that renders any `PrefabApp` tree with zero Zone 1 knowledge of its contents

---

## 2. Three-zone call map

There are two distinct paths through the system:

- **Path ①** — model-driven: the user sends a query; LangGraph drives the local model until it emits a tool call; the gateway forwards it to Zone 2; the response surfaces an MCP App overlay.
- **Path ②** — toolCall bridge: a widget inside the sandboxed MCP App iframe fires a `postMessage`; the React shell relays it directly to `InvokeCapability`, bypassing the model entirely.

```mermaid
%%{init: {'flowchart': {'padding': 24, 'nodeSpacing': 50, 'rankSpacing': 90, 'curve': 'linear'}}}%%
flowchart LR
    User([User])

    subgraph Z1["Zone 1 — Desktop Shell (Tauri + React)"]
        direction TB

        subgraph UI["React UI"]
            Conv["ConversationView"]
            Panel["PrefabOverlayPanel"]
            App["&lt;iframe sandbox&gt;  MCP App"]
        end

        subgraph Sidecar["Python Sidecar"]
            HI["HandleInteraction"]
            subgraph LG["LangGraph"]
                Loop["ReAct loop"]
                Mdl["Local model"]
                Loop --> Mdl
                Mdl -->|tools/call| Loop
            end
            IC["InvokeCapability"]
            GW["GovernedCapabilityGateway"]
            HI --> LG --> GW
            IC --> GW
        end
    end

    subgraph Z2["Zone 2 — Governed Mediation"]
        direction TB
        Gvn["authn → policy → capability → PrefabApp"]
        Sess[("AppInteractionSession  Redis")]
        Gvn --- Sess
    end

    subgraph Z3["Zone 3"]
        direction TB
        LLM["Reasoning model"]
        Data[("Enterprise sources")]
    end

    style Z1 fill:#e4ebf5,stroke:#5b7ba8,stroke-width:3px
    style UI fill:#f0f4fa,stroke:#a0b4cc,stroke-width:1px
    style Sidecar fill:#f0f4fa,stroke:#a0b4cc,stroke-width:1px
    style LG fill:#d9e4f0,stroke:#5b7ba8,stroke-width:1px
    style Z2 fill:#f5f0e4,stroke:#a08040,stroke-width:3px
    style Z3 fill:#eeebf5,stroke:#7d6d9a,stroke-width:3px

    User -->|query| Conv
    Conv -->|"① POST /v1/interaction"| HI
    HI -.->|"response + app_overlay"| Conv
    App -->|"② postMessage tools/call"| IC
    GW -->|MCP| Gvn
    Gvn -.->|"ToolResult + _meta"| GW
    Gvn -->|connector boundary| Z3
```

Zone 1 never imports Zone 2. All Zone 2 interaction goes through `GovernedCapabilityGateway` — the single exit point for both paths. Solid arrows are calls; dashed arrows are responses.

---

## 3. FastMCP Apps — Zone 2 overlay builder

### 3a. The builder pattern

Every capability that should display a visual overlay configures an `McpAppDefinition` using the `AppOverlay` fluent builder:

```python
# src/zone2/apps/builder.py
definition = (
    AppOverlay("domain.list")
    .model_text("Found {count} items")              # compact model-facing summary
    .app(ItemListFactory(columns=COLUMNS, ...))      # visual factory for the iframe
    .backend_caps("domain.list_page")               # capabilities unlocked per session
    .compile()                                       # returns McpAppDefinition
)
```

`McpAppDefinition` (frozen dataclass, `apps/contracts.py`):
```python
@dataclass(frozen=True)
class McpAppDefinition:
    capability_id: str
    model_projector: ModelResultProjector    # str for the model's context window
    app_projector: AppResultProjector        # PrefabApp tree for the iframe
    backend_capability_ids: frozenset[str]   # allowed backend calls this session
```

The model projector and app projector see the same `GovernedOutcome` but produce different outputs. The model gets a compact human-readable summary; the iframe gets a full structured Prefab tree.

### 3b. View factories

Three generic factories cover the common visual patterns:

| Factory | Use case | Key parameters |
|---|---|---|
| `ItemListFactory` | Paginated lists | `columns`, `app_title`, `items_key` |
| `RecordDetailFactory` | Single record detail | `fields`, `app_title`, `status_key` |
| `BookingConfirmationFactory` | Booking confirmation | `fields`, `app_title`, `status_key` |

All three live in `src/zone2/apps/factories/`. They implement `ViewFactory`:
```python
class ViewFactory(Protocol):
    def build(self, data: Mapping[str, Any]) -> PrefabApp: ...
```

`PrefabApp` is a `prefab_ui` Python type — a structured tree of generic node types (columns, tables, labels, buttons) that the renderer knows how to draw. Zone 1 never sees these types.

### 3c. Capability wiring

A plugin registers one `McpAppDefinition` per entry capability. Paginated capabilities also register a `backend_only=True` backend capability whose ID is listed in `backend_capability_ids`. At runtime, Zone 2 only allows backend calls whose IDs are in the `AppInteractionSession.allowed_backend_caps` set — requests for anything else are rejected before the connector boundary.

New capabilities follow the same pattern: define, build an `AppOverlay`, register. Zone 1 requires no changes.

### 3d. The app session

When a user views an overlay with paginated data, subsequent page requests must reach the same Zone 2 context. Zone 2 creates an `AppInteractionSession` (frozen dataclass):

```python
session_id: str                      # UUID4 — this is what Zone 1 calls "app_session_id"
principal_id: str                    # identity provider sub
org_id: str
entry_capability_id: str             # the capability that produced the initial overlay
allowed_backend_caps: frozenset[str] # capabilities this session may call
query_fingerprint: str               # stable hash of principal+cap+params
created_at: datetime
expires_at: datetime
```

Zone 2 writes this session's `session_id` into the MCP tool result `_meta` under the key `"zone2/app_session_id"`. Zone 1's gateway extracts it from there. It never travels inside the governed `structured_content` envelope.

---

## 4. The governed result envelope

When Zone 2 processes a capability with an app overlay, the MCP `ToolResult` has two parts:

**`structured_content`** — the governed data envelope (Zone 1 parses this):
```json
{
  "status": "completed",
  "request_id": "...",
  "result": { "items": [ ... ] },
  "provenance": { "reasoning_used": "...", "source_count": 0 },
  "zone2_app": {
    "$prefab": { "version": "0.3" },
    "view": { "type": "Div", "children": [ ... ] }
  }
}
```

**`_meta`** — MCP metadata (separate from the governed envelope):
```json
{ "zone2/app_session_id": "<uuid4>" }
```

Zone 1's gateway (`GovernedCapabilityGateway`) extracts `zone2_app` and `zone2/app_session_id` from `CompletedOutcome.app_meta` before the result reaches the application layer. The desktop sees them as `DirectResponseResultWire.app_overlay` and `DirectResponseResultWire.app_session_id`.

---

## 5. Zone 1 rendering pipeline

### 5a. Model-driven path (initial capability call)

```mermaid
sequenceDiagram
    participant User
    participant Desktop as Zone 1 Desktop (React)
    participant Sidecar as Zone 1 Sidecar (FastAPI)
    participant LangGraph as LangGraph Orchestrator
    participant Model as Local Model
    participant Gateway as GovernedCapabilityGateway
    participant Z2 as Zone 2 (FastMCP)

    User->>Desktop: submit query
    Desktop->>Sidecar: POST /v1/interaction
    Sidecar-->>Desktop: 202 + interaction_id
    Desktop->>Sidecar: GET /v1/interaction/{id}/result (polls)

    Sidecar->>LangGraph: HandleInteraction.execute()
    LangGraph->>Model: prompt + tool descriptions
    Model-->>LangGraph: tools/call → capability
    LangGraph->>Gateway: invoke(CapabilityInvocationRequest)
    Gateway->>Z2: MCP tools/call
    Z2-->>Gateway: ToolResult (structured_content + _meta)
    Gateway-->>LangGraph: CompletedOutcome (app_overlay + app_session_id extracted)
    LangGraph->>Model: tool result (model projector text only)
    Model-->>LangGraph: final answer text
    LangGraph-->>Sidecar: DirectResponseResult (response_text + app_overlay + app_session_id)
    Sidecar-->>Desktop: DirectResponseResultWire
    Desktop->>Desktop: PrefabOverlayPanel renders iframe
```

### 5b. `prefab:initial-data` injection

The renderer HTML is fetched once from the sidecar (`GET /v1/prefab-renderer` → Tauri `get_prefab_renderer`). Before setting `srcDoc`, Zone 1 injects the overlay JSON into the HTML:

```
renderer HTML                     Modified HTML (srcDoc)
─────────────────────────         ───────────────────────────────────────────
<html>                            <html>
  <head>                            <head>
    ...                               ...
  </head>              ───►          <script id="prefab:initial-data"
  <body>                                     type="application/json">
    ...                               {"$prefab":{"version":"0.3"},...}
  </body>                             </script>
</html>                             </head>
                                    <body>
                                      ...
                                    </body>
                                  </html>
```

The renderer's internal `dsr()` function reads this element at module load. The initial view appears without any postMessage handshake. HTML-sensitive characters (`&`, `<`, `>`) are escaped to Unicode escapes to prevent injection via overlay content.

---

## 6. The sandboxed iframe

The iframe runs with `sandbox="allow-scripts"` and no `allow-same-origin`, giving it an **opaque origin**. This is the critical security property.

| Property | In parent window | In iframe (opaque origin) |
|---|---|---|
| `window.__TAURI__` | Accessible | Blocked — opaque origin |
| Parent DOM | Accessible | Cross-origin blocked |
| `localStorage` / `sessionStorage` | Accessible | Blocked |
| Network requests | Allowed | Blocked — no `allow-same-origin` |
| `window.parent.postMessage` | — | Only outbound channel |
| JavaScript execution | Yes | Yes (`allow-scripts`) |

The `invoke_capability` Tauri command is **not listed** in the iframe's Tauri capability config — it is only accessible to the main window's JS. Even if a malicious payload in the renderer tried to call Tauri directly, it has no path to do so.

`postMessage` is the renderer's sole exit: it can tell the host its height, and it can send JSON-RPC requests. It cannot read responses it didn't ask for, cannot read parent state, and cannot escalate privileges.

---

## 7. Two-layer postMessage protocol

The renderer and parent window use two coexisting message formats over the same `postMessage` channel. The host discriminates by checking `data["jsonrpc"] === "2.0"` first — if present it's Layer 2; otherwise it's a Layer 1 type check.

| Layer | Format | Direction | Purpose |
|---|---|---|---|
| 1 | `{ type: "prefab:resize", height: <n> }` | renderer → host | Dynamic height adjustment |
| 2 | JSON-RPC 2.0 (`jsonrpc`, `id`, `method`) | bidirectional | MCP interactive protocol |

```mermaid
sequenceDiagram
    participant R as prefab_ui Renderer (iframe)
    participant H as PrefabOverlayPanel (host)

    R->>H: { type: "prefab:resize", height: 320 }
    Note over H: Layer 1 — setIframeHeight(320)

    R->>H: { jsonrpc:"2.0", id:1, method:"ui/initialize", params:{} }
    Note over H: Layer 2 — MCP handshake
    H-->>R: { jsonrpc:"2.0", id:1, result:{ protocolVersion, capabilities, serverInfo } }
    Note over R: Interactive mode enabled

    R->>H: { type: "prefab:resize", height: 440 }
    Note over H: Layer 1 — setIframeHeight(440)

    R->>H: { jsonrpc:"2.0", id:2, method:"tools/call", params:{ name, arguments } }
    Note over H: Layer 2 — widget action → InvokeCapability
    H-->>R: { jsonrpc:"2.0", id:2, result:{ content, isError:false } }
    Note over R: Update view with new data
```

**`id` correlation is mandatory.** The renderer tracks in-flight requests by auto-incrementing integer `id`. Responses must echo the exact same `id`. Without `ui/initialize` completing, the renderer stays in standalone (read-only) mode and widget buttons fail silently.

---

## 8. The toolCall bridge — full call flow

A widget press (pagination, drill-down) is **not a conversational turn**. It bypasses the model and orchestrator entirely.

```mermaid
sequenceDiagram
    participant Renderer as prefab_ui Renderer (iframe)
    participant Panel as PrefabOverlayPanel (React)
    participant Transport as RuntimeTransport (Tauri)
    participant Sidecar as Zone 1 Sidecar (FastAPI)
    participant UseCase as InvokeCapability
    participant Gateway as GovernedCapabilityGateway
    participant Z2 as Zone 2 (FastMCP)

    Renderer->>Panel: postMessage tools/call (JSON-RPC id=42)
    Panel->>Panel: validate params (name, arguments)
    Panel->>Panel: check appSessionId != null
    Panel->>Transport: invokeCapability({ sessionId, capabilityId, arguments, appSessionId })
    Transport->>Sidecar: POST /v1/capability/invoke (CapabilityInvokeWire)
    Sidecar-->>Transport: 202 + interaction_id
    Transport->>Sidecar: GET /v1/interaction/{id}/result (awaitInteraction)

    Sidecar->>UseCase: InvokeCapabilityCommand
    Note over UseCase: 1. apps_enabled gate<br/>2. AppInstance existence + token match<br/>3. Catalogue lookup (fail-closed)<br/>4. Acquire credentials
    UseCase->>Gateway: invoke(CapabilityInvocationRequest)<br/>arguments["session_id"] = app_session_id
    Gateway->>Z2: MCP tools/call (backend-only capability)
    Z2->>Z2: validate app_session_id against AppSessionStore
    Z2->>Z2: check allowed_backend_caps
    Z2-->>Gateway: ToolResult (new page data + updated app_session_id in _meta)
    Gateway-->>UseCase: CompletedOutcome
    Note over UseCase: complete_processing_turns(())<br/>← empty tuple, no LLM turn added
    UseCase-->>Sidecar: DirectResponseResult

    Sidecar-->>Transport: DirectResponseResultWire
    Transport-->>Panel: result
    Panel->>Renderer: postMessage JSON-RPC response (id=42, isError=false)
    Renderer->>Renderer: update view with new page data
```

### Key invariants

**1. Three-level local gate.** Before the catalogue lookup, `InvokeCapability` enforces: `apps_enabled` feature flag → `AppInstance` existence and ACTIVE state → `app_session_id` token match. All three checks run before Zone 2 is contacted (see [§9](#9-app-instance-lifecycle)).

**2. Fail-closed capability check.** `InvokeCapability` looks up `capability_id` in the session's `CapabilityCatalogue`. If the capability is not in the catalogue, the call is rejected and Zone 2 is never contacted.

**3. No conversation history mutation.** `session.complete_processing_turns(())` is called with an empty tuple. The LLM context window is unchanged. Page 2 of a list does not contaminate the conversation history.

**4. `app_session_id` threading.** Zone 2's backend handler reads the app session from `arguments["session_id"]` (`_SESSION_ID_PARAM`). Zone 1's `InvokeCapability` merges it in:
```python
gateway_arguments = dict(command.arguments) | {"session_id": command.app_session_id}
```
The iframe never sees `app_session_id` directly — it flows through the host only.

**5. Zone 1 `session_id` ≠ Zone 2 `session_id`.** Zone 1's `session_id` identifies the `InteractionSession` (conversation). Zone 2's `session_id` (what Zone 1 calls `app_session_id`) identifies the `AppInteractionSession` (the stateful overlay context). They are different concepts, different scopes, and must never be conflated.

---

## 9. App instance lifecycle

When the orchestrator returns a result containing `app_overlay`, Zone 1 tracks a single active `AppInstance` per conversation session. This gives Zone 1 a local record of the mounted overlay so it can enforce a fail-closed gate without relying solely on Zone 2.

### 9a. `AppInstance` state machine

```mermaid
stateDiagram-v2
    direction LR
    [*] --> ACTIVE : create_for_result()
    ACTIVE --> DESTROYED : destroy()\n(idempotent)
    DESTROYED --> DESTROYED : destroy()\n(no-op)
```

- **ACTIVE** — overlay is mounted; `InvokeCapability` may proceed.
- **DESTROYED** — session closed or instance torn down; all further `InvokeCapability` calls for that session are rejected.

### 9b. Instance creation (`HandleInteraction`)

```mermaid
flowchart TD
    A{app_overlay\nin result?} -- No --> Z[No App events\noverlay = None]
    A -- Yes --> B{apps_enabled?}
    B -- False --> C[emit AppResourceRejected\nstrip overlay from result\ntext response still delivered]
    B -- True --> D[AppInstanceRepository\n.create_for_result]
    D --> E[AppSandboxCoordinator\n.notify_instance_created]
    E --> F[emit AppInstanceCreated]
    F --> G[emit AppResourceAvailable\nresource_uri = zone2://app/id/version]
```

`apps_enabled` is a plain `bool` injected at construction time — not a `RuntimeConfiguration` object. Operators can disable the entire App overlay feature without touching Zone 2.

### 9c. Three-level local gate (`InvokeCapability`)

Before the catalogue lookup, `InvokeCapability` runs three fail-closed checks in order:

| Level | Check | Rejects with |
|---|---|---|
| 1 | `apps_enabled=False` | `APP_RESOURCE_REJECTED` |
| 2 | No `ACTIVE` `AppInstance` for the session | `APP_INSTANCE_NOT_FOUND` |
| 3 | `command.app_session_id ≠ instance.app_session_id` | `APP_SESSION_EXPIRED` |

Level 3 is the confused-deputy defence: an iframe presenting a stale token from a previous overlay cannot escalate to the current session. All three checks run before Zone 2 is contacted; Zone 2's `_validate_session` remains the authoritative enforcement boundary.

### 9d. Session close teardown

`LocalEdgeRuntime.close_session` checks for an active `AppInstance` before emitting `SessionClosed`. If one exists:

1. `instance.destroy()` — transitions to `DESTROYED`
2. `AppInstanceRepository.destroy_for_session(session_id)` — removes the record
3. `AppSandboxCoordinator.notify_instance_destroyed(app_instance_id)` — signals the render surface (no-op now; a future native mobile adapter replaces this with real mount/unmount signals)
4. Emit `AppInstanceDestroyed` on the SSE stream — the consumer always receives a terminal lifecycle event before `SessionClosed`

### 9e. `AppSandboxCoordinator` — the render surface seam

`AppSandboxCoordinator` (`contracts/ports.py`) is a `Protocol` with two hooks:

```python
async def notify_instance_created(self, instance: AppInstance) -> None: ...
async def notify_instance_destroyed(self, app_instance_id: AppInstanceId) -> None: ...
```

`NoOpAppSandboxCoordinator` is the current implementation. A future native mobile adapter will replace it with real platform-channel signals for mounting and unmounting the sandboxed surface.

---

## 10. `app_session_id` — full lifecycle

```mermaid
sequenceDiagram
    participant Z2 as Zone 2
    participant GW as GovernedCapabilityGateway
    participant HI as HandleInteraction
    participant Desktop as Desktop (React)
    participant iframe as prefab_ui iframe
    participant IC as InvokeCapability

    Z2->>GW: ToolResult\n_meta["zone2/app_session_id"] = "abc-123"\nstructured_content["zone2_app"] = {...}
    GW->>HI: CompletedOutcome\napp_session_id="abc-123"\napp_overlay={...}
    HI->>HI: AppInstanceRepository.create_for_result\napp_session_id stored in AppInstance
    HI->>Desktop: DirectResponseResultWire\napp_session_id="abc-123"\napp_overlay={...}

    Desktop->>iframe: srcdoc injection\n(prefab:initial-data contains app_overlay)
    Note over iframe: Renders initial view\nno knowledge of app_session_id

    iframe->>Desktop: postMessage tools/call\n{ name, arguments }
    Note over Desktop: Host holds app_session_id\niframe never sees it
    Desktop->>IC: InvokeCapabilityCommand\napp_session_id="abc-123"
    IC->>IC: Gate check: token matches AppInstance
    IC->>Z2: MCP tools/call\narguments["session_id"] = "abc-123"
    Z2->>Z2: validate against AppSessionStore
    Z2-->>IC: ToolResult (new page data)
    IC-->>Desktop: DirectResponseResultWire
    Desktop->>iframe: postMessage JSON-RPC response\n(id-correlated)
```

---

## 11. Sidecar endpoints

| Endpoint | Method | Response | Purpose |
|---|---|---|---|
| `/v1/prefab-renderer` | GET | 200 HTML | Serve bundled `prefab_ui` renderer HTML |
| `/v1/interaction` | POST | 202 | Submit conversational query (model-driven path) |
| `/v1/interaction/{id}/result` | GET | 200 | Poll for interaction result (shared by both paths) |
| `/v1/capability/invoke` | POST | 202 | Direct capability invocation (overlay toolCall bridge) |
| `/v1/interaction/{id}/events` | GET | SSE | Stream `InteractionAccepted`, `InteractionCompleted`, App lifecycle events |

All endpoints under `/v1/` require the `X-Host-Secret` header (ephemeral per-sidecar secret shared between Tauri shell and sidecar at startup).

---

## 12. Tauri commands

| Command | Rust function | Purpose |
|---|---|---|
| `get_prefab_renderer` | `commands::get_prefab_renderer` | Proxy `GET /v1/prefab-renderer`; result cached in Tauri process |
| `submit_interaction` | `commands::submit_interaction` | POST conversational query; mints `interaction_id` |
| `await_interaction` | `commands::await_interaction` | Poll `/v1/interaction/{id}/result` with backoff |
| `invoke_capability` | `commands::invoke_capability` | POST `/v1/capability/invoke`; mints `interaction_id` |

`invoke_capability` is **only listed in the main window's Tauri capability config**. It is not accessible from the sandboxed iframe.

---

## 13. `RuntimeTransport` — the abstraction boundary

All desktop feature code reaches the Zone 1 sidecar through `getRuntimeTransport()`, never by importing from `@platform/tauri` or `@tauri-apps/api/core` directly. This is enforced by the dependency cruiser config.

```typescript
// src/modules/runtime-client/transport/runtime-transport.ts
interface RuntimeTransport {
  getPrefabRenderer(): Promise<string>;
  invokeCapability(input: {
    sessionId: string;
    capabilityId: string;
    arguments: Record<string, unknown>;
    appSessionId: string;
  }): Promise<unknown>;
  awaitInteraction(input: { interactionId: string }): Promise<unknown>;
  // ... other methods
}
```

The production implementation (`TauriRuntimeTransport`) delegates to Tauri commands. Tests use `InMemoryRuntimeTransport` with per-operation `Responder` fakes — no Tauri, no sidecar.

---

## 14. Adding a new capability with an overlay

This is the process a Zone 2 developer follows to add a new governed capability that produces a visual overlay. **Zone 1 requires no changes.**

**Step 1 — Define the capability** in Zone 2 (`src/zone2/plugins/<domain>/capabilities.py`):
```python
MY_CAPABILITY = CapabilityDefinition(
    capability_id="domain.list",
    name="domain.list",
    ...
)
```

**Step 2 — Build an overlay definition** using the fluent builder:
```python
from zone2.apps.builder import AppOverlay
from zone2.apps.factories import ItemListFactory

MY_APP_DEFINITION = (
    AppOverlay(MY_CAPABILITY)
    .model_text("Found {count} items")
    .app(ItemListFactory(columns=MY_COLUMNS, app_title="My List", items_key="items"))
    .backend_caps("domain.list_page")  # if pagination needed
    .compile()
)
```

**Step 3 — Register and wire** via `ContainerModuleRegistry`:
```python
registry.register_capability(MY_CAPABILITY, app_overlay=MY_APP_DEFINITION)
```

**Step 4 — Add backend capability** if paginated:
```python
MY_PAGE_CAPABILITY = CapabilityDefinition(
    capability_id="domain.list_page",
    backend_only=True,
    ...
)
registry.register_capability(MY_PAGE_CAPABILITY)
```

Zone 1's `PrefabOverlayPanel` will render the output without modification. The `backend_only=True` flag is what allows Zone 1's `InvokeCapability` to call it directly — Zone 2 checks `allowed_backend_caps` on the `AppInteractionSession`.

---

## 15. When to escalate beyond sandboxed iframe

The current `sandbox="allow-scripts"` approach is appropriate for governed Zone 2 content in bundled mode. Escalate to a secondary Tauri `WebviewWindow` when:

- A **third-party** (non-Zone-2) MCP server produces overlays
- The renderer needs network access beyond loopback (CDN resources, external assets)
- The HTML contains `<script src="https://...">` references (detectable: scan before setting `srcDoc`)
- The overlay requires OS-level permissions (camera, microphone, filesystem)

---

## 16. TUI fallback

The terminal UI (`zone1 tui`) cannot render HTML. The generic fallback dispatcher (`cli/tui/apps_placeholder.py::_render_prefab_node`) recurses only on the structural `Stack` type and renders all other node types as generic key-value Rich panels.

This is consistent with the zero-knowledge principle: the TUI knows only `Stack` from Prefab's structure. It has no knowledge of any capability-specific node types.

---

## 17. Version pinning

Both zones must use the **same `prefab-ui` version**. A mismatch would cause the renderer to misinterpret the `zone2_app` JSON tree. This is enforced as a build-time constraint in both `pyproject.toml` files.

`prefab_ui` is the single source of truth for:
- The `PrefabApp` Python types Zone 2 uses to build trees
- The renderer HTML bundle Zone 1 serves from `GET /v1/prefab-renderer`

---

## File index

| File | Zone | Purpose |
|---|---|---|
| `src/zone2/apps/builder.py` | 2 | `AppOverlay` fluent builder |
| `src/zone2/apps/contracts.py` | 2 | `McpAppDefinition`, `AppInteractionSession`, protocols |
| `src/zone2/apps/factories/` | 2 | `ItemListFactory`, `RecordDetailFactory`, `BookingConfirmationFactory` |
| `src/zone2/api/mcp/tools.py` | 2 | `_build_capability_handler` — overlay finalization + session creation |
| `runtime/src/zone1/application/invoke_capability.py` | 1 | `InvokeCapability` use case — toolCall bridge + three-level gate |
| `runtime/src/zone1/application/handle_interaction.py` | 1 | `HandleInteraction` — App instance creation + event emission |
| `runtime/src/zone1/contexts/app_hosting/domain/instance.py` | 1 | `AppInstance` state machine |
| `runtime/src/zone1/infrastructure/app_instances/in_memory.py` | 1 | `InMemoryAppInstanceRepository` |
| `runtime/src/zone1/api/http/routers.py` | 1 | `POST /v1/capability/invoke` + `GET /v1/prefab-renderer` endpoints |
| `runtime/src/zone1/api/wire/commands.py` | 1 | `CapabilityInvokeWire` wire schema |
| `runtime/src/zone1/contracts/ports.py` | 1 | `AppInstanceRepository`, `AppSandboxCoordinator`, `GovernedCapabilityGateway` ports |
| `desktop/src-tauri/src/commands.rs` | 1 | `invoke_capability`, `get_prefab_renderer` Tauri commands |
| `desktop/src/features/conversation/PrefabOverlayPanel.tsx` | 1 | Sandboxed iframe + two-layer postMessage bridge |
| `desktop/src/features/conversation/InteractionResultView.tsx` | 1 | Passes `sessionId` + `appSessionId` from result to panel |
| `desktop/src/modules/runtime-client/transport/runtime-transport.ts` | 1 | `RuntimeTransport` interface |
| `desktop/src/platform/tauri/tauri-runtime-transport.ts` | 1 | Production Tauri implementation |
| `desktop/src/shared/testing/in-memory-runtime-transport.ts` | 1 | Test fake |
| `docs/adr/0028-*.md` | 1 | Full sandboxed iframe decision record |
| `runtime/docs/adr/0029-*.md` | 1 | App instance lifecycle and local gate decision record |
