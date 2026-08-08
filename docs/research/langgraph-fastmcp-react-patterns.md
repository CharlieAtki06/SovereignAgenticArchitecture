# LangGraph + FastMCP v4 ReAct Production Patterns

**Date researched:** 2026-08-08  
**Audience:** Technical architect making implementation decisions for Zone 1 (edge runtime)  
**Context:** Zone 1 uses Ollama/gemma4 (4k–8k context), makes governed tool calls through a FastMCP v4 Zone 2 server that policy-checks, audits, and may require human confirmation before execution.

---

## Table of Contents

1. [LangGraph ReAct Production Patterns](#1-langgraph-react-production-patterns)
2. [FastMCP v4 Python Client Patterns](#2-fastmcp-v4-python-client-patterns)
3. [Token Efficiency in ReAct Loops](#3-token-efficiency-in-react-loops)
4. [Alternatives to Naive Message Accumulation](#4-alternatives-to-naive-message-accumulation)
5. [Governed and Audited Tool Execution in ReAct](#5-governed-and-audited-tool-execution-in-react)

---

## 1. LangGraph ReAct Production Patterns

### How `create_react_agent` Works

`create_react_agent` is the high-level factory in `langgraph.prebuilt`. It constructs a `StateGraph` with two primary nodes—**agent** (calls the LLM) and **tools** (executes tool calls)—plus optional hook nodes. Source: [LangChain Reference — create_react_agent](https://reference.langchain.com/python/langgraph.prebuilt/chat_agent_executor/create_react_agent)

```python
from langgraph.prebuilt import create_react_agent

graph = create_react_agent(
    model="ollama:gemma4",          # or a BaseChatModel instance
    tools=[tool_a, tool_b],
    prompt="You are a clinical assistant. Be concise.",
    checkpointer=checkpointer,      # required for HITL interrupts
)
```

**Full signature (as of 2026-08):**

```python
create_react_agent(
    model,                          # str | BaseChatModel | Callable[[state, runtime], model]
    tools,                          # Sequence[BaseTool | Callable | dict] | ToolNode
    *,
    prompt=None,                    # None | str | SystemMessage | Callable
    response_format=None,           # structured output schema
    pre_model_hook=None,            # RunnableLike — runs before each LLM call
    post_model_hook=None,           # RunnableLike — runs after LLM, before routing (v2 only)
    state_schema=None,              # custom TypedDict; must include `messages`
    context_schema=None,            # runtime context type
    checkpointer=None,              # required for HITL and persistence
    store=None,                     # cross-thread persistence
    interrupt_before=None,          # ["agent"] | ["tools"]
    interrupt_after=None,           # ["agent"] | ["tools"]
    version="v2",                   # "v1" | "v2"
    name=None,
) -> CompiledStateGraph
```

### Internal Graph Structure

The generated graph (v2) has this topology:

```
START → [pre_model_hook →] agent → [post_model_hook →] tools → agent
                                                               ↓
                                                              END
```

Routing is done by `should_continue`: if the last AIMessage has `tool_calls`, execution routes to `tools`; otherwise the graph ends (or routes to a structured-response node if `response_format` is set). Source: [DeepWiki — ReAct Agent (create_react_agent)](https://deepwiki.com/langchain-ai/langgraph/8.1-react-agent-(create_react_agent))

**v1 vs v2 — the critical difference for governed tool calls:**

| | v1 | v2 |
|---|---|---|
| Tool dispatch | All tool calls in one `ToolNode` invocation (parallel) | Each tool call dispatched as a separate `Send` object |
| `post_model_hook` | Not supported | Supported |
| Suited for | Simple, low-governance cases | Governed, per-call-audited execution |

For Zone 1/Zone 2 where every tool call goes through a separate governance check, **v2 is correct**. The `Send` API means each tool call gets its own execution unit, enabling per-call interrupts and correlation IDs.

### Loop Termination

The loop terminates when:
1. The LLM returns an AIMessage with no `tool_calls` (normal completion).
2. `remaining_steps` is exhausted — the agent returns `"Sorry, need more steps to process this request."` instead of making another call. The `remaining_steps` managed channel is tracked automatically by the prebuilt graph.
3. The graph hits the `recursion_limit` config — raises `GraphRecursionError`. Default limit is 25 super-steps.

To set the recursion limit (counts node executions × 2 per loop iteration):

```python
result = graph.invoke(
    {"messages": [HumanMessage(content="...")]},
    config={"recursion_limit": 50},  # raise for complex multi-step tasks
)
```

For a small context window model like gemma4, limiting to 10–15 tool-call loops is advisable; each loop adds message history. Source: [LangChain Docs — GRAPH_RECURSION_LIMIT](https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT)

### `create_react_agent` vs Custom `StateGraph`

**Use `create_react_agent` (prebuilt) when:**
- Standard tool-calling loop: call model → execute tools → repeat
- You need HITL via `interrupt_before`/`interrupt_after`
- You need `pre_model_hook` for context trimming or `post_model_hook` for approval gates
- You want to embed the agent as a subgraph inside a larger custom `StateGraph`

**Build a custom `StateGraph` when:**
- Parallel node execution beyond what v2 Send provides
- Supervisor-worker multi-agent patterns
- Complex conditional routing based on domain logic, not just tool_calls presence
- Non-standard state shapes where messages is not the primary state key

The LangChain team designed the two-level system deliberately: `create_react_agent` for reasonable defaults, `StateGraph` for full control. Source: [LangGraph Tutorial — Build a Working ReAct Agent with the v1.0 API](https://agentsindex.ai/blog/langgraph-tutorial)

**Manual StateGraph that mirrors what `create_react_agent` builds:**

```python
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import AIMessage

model_with_tools = local_model.bind_tools(tools)

def call_model(state: MessagesState) -> dict:
    response = model_with_tools.invoke(state["messages"])
    return {"messages": [response]}

builder = StateGraph(MessagesState)
builder.add_node("agent", call_model)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition, {
    "tools": "tools",
    "__end__": END,
})
builder.add_edge("tools", "agent")
graph = builder.compile(checkpointer=checkpointer)
```

`tools_condition` is the built-in routing function that checks for `tool_calls`. Source: [langchain-ai/langchain-mcp-adapters README](https://github.com/langchain-ai/langchain-mcp-adapters)

### Streaming in a ReAct Loop

Three stream modes are relevant for production. When `stream_mode` is a list, the iterator yields `(mode, chunk)` tuples. Source: [Focused.io — Streaming LangGraph Agents](https://focused.io/lab/streaming-agent-state-with-langgraph)

| Mode | What it emits | Use for |
|---|---|---|
| `"updates"` | State delta from each node | Showing node-level progress |
| `"messages"` | LLM tokens + metadata | Token-by-token chat UI |
| `"custom"` | Arbitrary data from `get_stream_writer()` | Progress bars, status messages |

```python
# Production streaming pattern — combine all three
async for mode, chunk in graph.astream(
    {"messages": [HumanMessage(content=user_input)]},
    config=thread_config,
    stream_mode=["updates", "custom", "messages"],
):
    if mode == "messages":
        message_chunk, metadata = chunk
        if isinstance(message_chunk.content, str) and message_chunk.content:
            print(message_chunk.content, end="", flush=True)
    elif mode == "custom":
        # Emit progress from within a node via get_stream_writer()
        print(f"[status] {chunk.get('message', '')}")
    elif mode == "updates":
        print(f"\n[node completed]")
```

**Important production gotcha:** Tool calls in `messages` mode return lists for `content`, not strings. Always check `isinstance(message_chunk.content, str)` before concatenating.

**Emitting custom progress from within a node:**

```python
from langgraph.config import get_stream_writer

def call_model(state: MessagesState) -> dict:
    writer = get_stream_writer()
    writer({"status": "calling_llm", "message": "Sending to model..."})
    response = model_with_tools.invoke(state["messages"])
    writer({"status": "llm_done"})
    return {"messages": [response]}
```

For FastAPI + SSE deployment, set `X-Accel-Buffering: no` and disable nginx `proxy_buffering` to prevent batching.

### Stateful Dependency Injection into Nodes and Tools

LangGraph v2 provides a `Runtime` / `ToolRuntime` injection mechanism. Instead of global state or closures, declare runtime dependencies as typed parameters. Source: [LangChain Reference — ToolRuntime](https://reference.langchain.com/python/langgraph.prebuilt/tool_node/ToolRuntime)

```python
from langgraph.prebuilt import ToolRuntime
from langchain_core.tools import tool

@tool
def get_patient_record(patient_id: str, runtime: ToolRuntime) -> dict:
    """Fetch a patient record through the governed gateway."""
    # runtime.config holds RunnableConfig (thread_id, run_id, configurable)
    # runtime.state holds current graph state
    # runtime.tool_call_id is the unique ID for this invocation
    # runtime.store is the cross-thread BaseStore
    # runtime.context is user-defined context passed at invocation time
    
    user_jwt = runtime.config["configurable"].get("user_jwt")
    correlation_id = runtime.tool_call_id
    return zone2_gateway.call(patient_id, jwt=user_jwt, trace_id=correlation_id)
```

`ToolRuntime` is injected automatically when a parameter named `runtime` with type `ToolRuntime` is declared — no `Annotated` wrapper needed. The LLM never sees this parameter; it is filtered from tool schema validation errors.

For `context_schema`, pass a typed dataclass to `create_react_agent` and supply it at invocation:

```python
from dataclasses import dataclass

@dataclass
class AgentContext:
    user_jwt: str
    session_id: str

graph = create_react_agent(model, tools, context_schema=AgentContext)

result = await graph.ainvoke(
    {"messages": [HumanMessage(content="...")]},
    config=RunnableConfig(
        configurable={"thread_id": "sess-123"},
        context=AgentContext(user_jwt=jwt, session_id="sess-123"),
    ),
)
```

---

## 2. FastMCP v4 Python Client Patterns

> **Package note:** The PyPI package is `fastmcp` (version 3.4.6 as of 2026-08-05). The documentation and community refer to it as "FastMCP v4" to distinguish it from the original low-level MCP SDK. Source: [PyPI — fastmcp](https://pypi.org/project/fastmcp/)

### Connection Lifecycle

FastMCP uses async context managers. Entering the context establishes the connection and negotiates the protocol era. **There is no persistent connection across multiple `async with` blocks** — each context manager entry performs a new handshake. Source: [FastMCP Docs — The FastMCP Client](https://gofastmcp.com/clients/client)

```python
from fastmcp import Client

# Per-call connection (simplest, safest, not efficient for high-frequency use)
async with Client("https://zone2.internal/mcp") as client:
    tools = await client.list_tools()
    result = await client.call_tool("patient_record", {"patient_id": "P001"})
    print(result.data)
```

**For Zone 1's governed gateway:** wrap the `Client` in a long-lived async context to hold a single connection across the agent loop. This avoids a full handshake on every tool call.

```python
import asyncio
from fastmcp import Client

class Zone2Gateway:
    def __init__(self, url: str, jwt: str):
        self._client = Client(
            url,
            mode="auto",
            cache=True,       # cache list_tools responses
            timeout=30.0,
        )
        self._jwt = jwt
        self._cm = None

    async def __aenter__(self):
        self._cm = self._client.__aenter__
        await self._client.__aenter__()
        return self

    async def __aexit__(self, *args):
        await self._client.__aexit__(*args)

    async def list_tools(self):
        return await self._client.list_tools()

    async def call_tool(self, name: str, args: dict, correlation_id: str) -> any:
        return await self._client.call_tool(
            name,
            args,
            meta={"trace_id": correlation_id, "caller": "zone1-edge"},
        )
```

### Tool Discovery and Prefetch/Cache

`list_tools()` returns `list[mcp.types.Tool]` and auto-paginates if the server paginates. Source: [FastMCP — tools mixin](https://gofastmcp.com/python-sdk/fastmcp-client-mixins-tools)

```python
async with client:
    tools = await client.list_tools()
    # Each tool: tool.name, tool.description, tool.inputSchema (JSON Schema)
```

**Response caching** is opt-in and honours server cache hints (modern protocol era only):

```python
client = Client("https://zone2.internal/mcp", mode="auto", cache=True)

async with client:
    tools = await client.list_tools()   # fetched from server
    tools = await client.list_tools()   # served from cache — no round-trip
    
    # Force-refresh if tools may have changed:
    fresh = await client.list_tools_mcp(cache_mode="refresh")
```

**For Zone 1:** At startup, hold the connection open and call `list_tools()` once. Convert the results to LangChain tools (see §2.4 below) and pass them to `create_react_agent`. No tool schema re-fetching is needed per call.

### Transport Options

| Transport | When to use |
|---|---|
| In-memory | Same-process testing of Zone 2 without subprocess overhead |
| STDIO (`PythonStdioTransport`) | Local Zone 2 as subprocess — simple but no HTTP auth headers |
| HTTP / streamable HTTP | Production: Zone 2 as network service, supports Bearer token headers |

```python
# HTTP transport with per-connection auth header
client = Client(
    "https://zone2.internal/mcp",
    mode="auto",
    cache=True,
)
# Note: FastMCP native Client does not support per-call header injection.
# For per-call JWT, use langchain-mcp-adapters (see §2.4) which supports
# headers at client configuration time.
```

### Recommended Pattern: FastMCP + LangGraph via `langchain-mcp-adapters`

The `langchain-mcp-adapters` package (version 0.3.2, 2026-08-06, Python >=3.10) is the recommended bridge between FastMCP servers and LangGraph agents. It converts MCP tools to LangChain `BaseTool` instances transparently. Source: [PyPI — langchain-mcp-adapters](https://pypi.org/project/langchain-mcp-adapters/)

```bash
pip install langchain-mcp-adapters
```

**Single server pattern:**

```python
from langchain_mcp_adapters.tools import load_mcp_tools
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langgraph.prebuilt import create_react_agent

server_params = StdioServerParameters(
    command="python",
    args=["/path/to/zone2_server.py"],
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await load_mcp_tools(session)
        
        agent = create_react_agent(model, tools)
        result = await agent.ainvoke({"messages": [HumanMessage(content="...")]})
```

**Multi-server / HTTP with auth headers:**

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

# headers are sent with every request — use for Bearer token auth
client = MultiServerMCPClient({
    "zone2": {
        "transport": "http",
        "url": "https://zone2.internal/mcp",
        "headers": {
            "Authorization": f"Bearer {jwt_token}",
            "X-Correlation-ID": session_id,
        },
    }
})

async with client:
    tools = await client.get_tools()
    agent = create_react_agent(model, tools)
    result = await agent.ainvoke({"messages": [HumanMessage(content="...")]})
```

Source: [GitHub — langchain-ai/langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters)

**Important limitation:** `langchain-mcp-adapters` injects headers at connection time, not per-call. For per-call JWT refresh, use a custom tool wrapper or rotate the client when the token changes.

### Reducing Per-Call Overhead

- **Hold the connection open** across the agent loop (one `async with` context per user session, not per tool call).
- **Cache tool schemas** — call `list_tools()` once at startup; MCP schemas don't change between calls.
- **Use `meta` for observability** without extra round-trips:

```python
result = await client.call_tool(
    "patient_lookup",
    {"nhs_number": "123456789"},
    meta={"trace_id": correlation_id, "user": user_id, "session": session_id},
    timeout=10.0,
)
```

The `meta` parameter (fastmcp v2.13.1+) passes observability data alongside every call without any schema changes. Zone 2 can extract these from the MCP request envelope for audit logging.

---

## 3. Token Efficiency in ReAct Loops

### The Problem for Small Models

Each loop iteration appends at minimum: one AIMessage (with tool_calls), one ToolMessage per tool call, and the next model invocation sees all accumulated history. For gemma4 with a 4k–8k context window, **three to five multi-tool iterations can exhaust the window**.

### Pattern 1: `pre_model_hook` + `trim_messages`

`pre_model_hook` executes before every LLM call in the agent loop. Use it to trim the message list without modifying state permanently. Source: [Vadym Barda (@vadymbarda) on X](https://x.com/vadymbarda/status/1907831299487748191)

```python
from langchain_core.messages import trim_messages, SystemMessage
from langgraph.prebuilt import create_react_agent

def trim_hook(state: dict) -> dict:
    """Keep system prompt + last N tokens of history."""
    trimmed = trim_messages(
        state["messages"],
        strategy="last",
        token_counter=count_tokens_approximately,  # your tokenizer fn
        max_tokens=3000,          # conservative limit for 4k window
        include_system=True,      # never trim the system message
        start_on="human",         # first kept message must be Human
        end_on=("human", "tool"), # last kept message must be Human or Tool
        allow_partial=False,      # don't cut mid-message
    )
    return {"messages": trimmed}

agent = create_react_agent(
    model=local_model,
    tools=tools,
    pre_model_hook=trim_hook,
)
```

The `trim_messages` function is part of `langchain_core.messages`. `include_system=True` preserves the system prompt through all trimming. Source: [C# Corner — Context Window Limits in LangGraph](https://www.c-sharpcorner.com/article/context-window-limits-in-langgraph-with-real-time-use-case/)

**Important:** `pre_model_hook` returns a dict that overrides state for the model call only — it does not write back to the checkpointed state. The full history is preserved in the checkpointer; only the model sees the trimmed view.

### Pattern 2: Summarise and Replace

When trimming discards context you need, summarise old messages instead:

```python
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

async def summarise_hook(state: dict) -> dict:
    messages = state["messages"]
    
    # Only summarise if we're over threshold
    if len(messages) < 10:
        return {"messages": messages}
    
    # Summarise all but the last 4 messages
    to_summarise = messages[:-4]
    recent = messages[-4:]
    
    summary_prompt = [
        SystemMessage(content="Summarise the following conversation history concisely."),
        *to_summarise,
    ]
    summary = await small_llm.ainvoke(summary_prompt)  # use cheap/fast model
    
    return {
        "messages": [
            SystemMessage(content=f"[Conversation summary: {summary.content}]"),
            *recent,
        ]
    }

agent = create_react_agent(model, tools, pre_model_hook=summarise_hook)
```

Source: [IdeenTech — Short-Term Memory in LangGraph](https://ideentech.com/understanding-short-term-memory-in-langgraph-a-hands-on-guide/)

### Pattern 3: Compress Tool Results Before Appending

Large tool results (e.g., full FHIR bundles) are the primary cause of context bloat. Compress the result before it's appended by wrapping the tool:

```python
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage

@tool
def get_patient_observations(patient_id: str) -> str:
    """Get recent observations for a patient."""
    raw = zone2_gateway.get_observations(patient_id)
    
    # Extract only the fields the model needs to reason about
    summary = {
        "count": len(raw["entry"]),
        "latest_bp": extract_latest(raw, "blood-pressure"),
        "latest_hr": extract_latest(raw, "heart-rate"),
    }
    # Return compressed representation, not raw JSON
    return f"Found {summary['count']} observations. BP: {summary['latest_bp']}, HR: {summary['latest_hr']}"
```

This is the most effective single optimisation for small models. The model rarely needs the raw FHIR bundle; it needs extracted facts.

### Pattern 4: Token Budget per Tool Result

Cap tool results at a hard token limit using a `ToolNode` wrapper:

```python
from langgraph.prebuilt import ToolNode
from langchain_core.tools import BaseTool

MAX_TOOL_RESULT_TOKENS = 500

class BudgetedToolNode(ToolNode):
    """ToolNode that truncates oversized tool results."""
    
    def _format_tool_result(self, content: str, tool_call_id: str) -> ToolMessage:
        tokens = approximate_token_count(content)
        if tokens > MAX_TOOL_RESULT_TOKENS:
            content = truncate_to_tokens(content, MAX_TOOL_RESULT_TOKENS)
            content += f"\n[Result truncated at {MAX_TOOL_RESULT_TOKENS} tokens]"
        return ToolMessage(content=content, tool_call_id=tool_call_id)
```

[unverified] The `_format_tool_result` override is not documented in primary sources; it is inferred from the `ToolNode` source code structure. Verify against the actual class in `langgraph.prebuilt.tool_node` before implementing.

---

## 4. Alternatives to Naive Message Accumulation

### `MessagesState` and `add_messages` Reducer

`MessagesState` (from `langgraph.graph`) is the canonical state type for agent graphs. It uses the `add_messages` reducer which merges incoming messages by ID. Source: [GitHub — langgraph/libs/langgraph/langgraph/graph/message.py](https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/langgraph/graph/message.py)

Key behaviours:
- Messages with the same `id` **replace** existing messages (enables editing tool calls).
- A `RemoveMessage` object with a given ID **deletes** that message from state.
- A `REMOVE_ALL_MESSAGES` token **clears the entire history**.

```python
from langchain_core.messages import RemoveMessage
from langgraph.graph import MessagesState

# Delete a specific message by ID
def remove_old_tool_result(state: MessagesState) -> dict:
    old_msg_id = state["messages"][2].id
    return {"messages": [RemoveMessage(id=old_msg_id)]}
```

### Working Memory Pattern

Keep the full history in the checkpointer but pass only a compressed working memory window to the model. This is exactly what `pre_model_hook` enables — it receives the full `state` (from checkpointer) and returns a modified view for the model call, without writing back.

```python
WORKING_MEMORY_SIZE = 6  # messages (3 turns: human + ai + tool)

def working_memory_hook(state: MessagesState) -> dict:
    messages = state["messages"]
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    recent = messages[-WORKING_MEMORY_SIZE:]
    return {"messages": system_msgs + recent}
```

### Episodic Summary Pattern

For longer sessions (multiple clinical queries), maintain an episodic summary field in custom state:

```python
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    episode_summary: str    # compressed summary of earlier turns

def inject_summary_hook(state: AgentState) -> dict:
    """Prepend episode summary as a system message, then trim recent window."""
    messages = state["messages"]
    summary = state.get("episode_summary", "")
    
    if summary:
        context_msg = SystemMessage(content=f"[Prior context: {summary}]")
        recent = trim_messages(messages, strategy="last", max_tokens=2500, ...)
        return {"messages": [context_msg] + recent}
    else:
        return {"messages": trim_messages(messages, max_tokens=3000, ...)}

async def summarise_and_archive(state: AgentState) -> dict:
    """Run after each completed user request to compress history."""
    new_summary = await summariser_llm.ainvoke(
        [SystemMessage(content="Extend this summary with the new events."),
         SystemMessage(content=state.get("episode_summary", "")),
         *state["messages"][-6:]]
    )
    return {
        "episode_summary": new_summary.content,
        "messages": [REMOVE_ALL_MESSAGES],  # clear full history; summary is the record
    }
```

Source pattern referenced in: [LangGraph Memory Systems — machinelearningplus](https://machinelearningplus.com/gen-ai/langgraph-memory-systems-short-long-term-conversation/)

---

## 5. Governed and Audited Tool Execution in ReAct

### The Core Architectural Principle

As documented in governance integration guides: **if a tool schema is exposed to the model, the model can request its execution**. Governance must be enforced at the execution layer, not through prompt instructions. For Zone 1/Zone 2, this is already ensured by architecture: Zone 2 is the only thing that can actually execute tools, and every call through the MCP interface is policy-checked before execution. Source: [Dativo — Controlling LangGraph Tool Calls](https://blog.dativo.io/p/controlling-langgraph-tool-calls)

### Pattern 1: `interrupt_before="tools"` for Human Approval

The simplest production HITL pattern uses `interrupt_before`:

```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()  # use postgres/sqlite for production
agent = create_react_agent(
    model=local_model,
    tools=zone2_tools,
    checkpointer=checkpointer,
    interrupt_before=["tools"],   # pause BEFORE every tool execution
)

thread_config = {"configurable": {"thread_id": "session-001"}}

# First call — runs until the interrupt
result = agent.invoke(
    {"messages": [HumanMessage(content="Look up patient P001")]},
    config=thread_config,
)
# result["messages"][-1] is an AIMessage with tool_calls but not yet executed

# Inspect the proposed tool call
last = result["messages"][-1]
print(last.tool_calls)  # [{"name": "patient_lookup", "args": {"nhs_number": "..."}}}]

# Human approves — resume with None (accept) or Command(resume=...) for edits
from langgraph.types import Command
agent.invoke(Command(resume=None), config=thread_config)
```

Source: [LangChain Blog — Making it easier to build HITL agents with interrupt](https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt)

**Production behaviour:** An interrupted thread consumes only storage, not compute. It can resume on a different machine, days later. This maps cleanly to Zone 2's async human confirmation flow.

### Pattern 2: `interrupt()` Inside a Tool for Fine-Grained Approval

For selective approval (only some tool calls require human review), use `interrupt()` inside the tool body:

```python
from langgraph.types import interrupt
from langchain_core.tools import tool

HIGH_RISK_TOOLS = {"prescribe_medication", "discharge_patient"}

@tool
def prescribe_medication(medication: str, dose: str, patient_id: str) -> str:
    """Prescribe medication to a patient. Requires clinician approval."""
    
    # Pause and surface the proposed action to the human
    decision = interrupt({
        "action": "prescribe_medication",
        "args": {"medication": medication, "dose": dose, "patient_id": patient_id},
        "message": f"Approve prescribing {dose} of {medication} to patient {patient_id}?",
    })
    
    if decision.get("approved"):
        return zone2_gateway.prescribe(medication, dose, patient_id)
    else:
        return f"Prescription rejected: {decision.get('reason', 'no reason given')}"
```

The `interrupt()` function is production-safe — it does not block a thread but serialises the graph state to the checkpointer and waits. Source: [LangChain Blog — Making it easier to build HITL agents with interrupt](https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt)

### Pattern 3: `post_model_hook` for Approval Gate Before Tool Execution

The `post_model_hook` runs after the LLM call but before routing to `tools`. Use it for a synchronous approval check that doesn't require a full interrupt:

```python
from langgraph.types import interrupt

def governance_gate(state: dict) -> dict:
    """Review LLM's proposed tool calls before execution."""
    last = state["messages"][-1]
    
    if not hasattr(last, "tool_calls") or not last.tool_calls:
        return {}  # no tool calls — pass through
    
    for tc in last.tool_calls:
        if tc["name"] in HIGH_RISK_TOOLS:
            # Surface for human approval
            decision = interrupt({
                "tool_name": tc["name"],
                "args": tc["args"],
                "type": "tool_approval_required",
            })
            if not decision.get("approved"):
                # Replace the tool_calls with an empty AIMessage to abort
                return {"messages": [AIMessage(
                    content=f"Tool call to {tc['name']} was rejected by policy."
                )]}
    return {}

agent = create_react_agent(
    model=local_model,
    tools=zone2_tools,
    post_model_hook=governance_gate,
    checkpointer=checkpointer,
    version="v2",  # required for post_model_hook
)
```

Source: [DeepWiki — ReAct Agent create_react_agent](https://deepwiki.com/langchain-ai/langgraph/8.1-react-agent-(create_react_agent))

### Pattern 4: `ToolNode` with `wrap_tool_call` Interceptor for Audit

`ToolNode` accepts a `wrap_tool_call` parameter for wrapping every tool execution with custom logic. This is the lowest-level hook — it runs synchronously inside the tool node, receives a `ToolCallRequest`, and can modify arguments before execution. Source: [DeepWiki — ToolNode and Tool Execution](https://deepwiki.com/langchain-ai/langgraph/8.2-toolnode-and-tool-execution)

```python
from langgraph.prebuilt import ToolNode
from langgraph.prebuilt.tool_node import ToolCallRequest

def audit_interceptor(request: ToolCallRequest):
    """Log every tool call before it executes."""
    audit_log.append({
        "tool": request.tool_call["name"],
        "args": request.tool_call["args"],
        "tool_call_id": request.tool_call["id"],
        "timestamp": datetime.utcnow().isoformat(),
    })
    # Return the (possibly modified) request
    return request  
    # Or: return request.override(args={**request.tool_call["args"], "caller": "zone1"})

governed_tool_node = ToolNode(zone2_tools, wrap_tool_call=audit_interceptor)

# Use in create_react_agent:
agent = create_react_agent(model, governed_tool_node)  # pass ToolNode directly
```

### Pattern 5: `tool_call_id` as the Correlation Key

Every tool execution in LangGraph has a `tool_call_id` that links:
- The `AIMessage.tool_calls[n]["id"]` — what the model requested
- The `ToolMessage.tool_call_id` — what was returned
- `ToolRuntime.tool_call_id` — accessible inside the tool

This ID is the natural audit correlation key. Zone 2 should expect it (e.g., in the MCP `meta` field) and include it in every audit record.

```python
@tool
def zone2_tool(query: str, runtime: ToolRuntime) -> str:
    """Tool that passes its call ID to Zone 2 for audit correlation."""
    return zone2_gateway.call(
        query,
        meta={
            "trace_id": runtime.tool_call_id,
            "user": runtime.config["configurable"].get("user_id"),
            "session": runtime.config["configurable"]["thread_id"],
        }
    )
```

### Pattern 6: Per-Request Auth Binding via `contextvars`

For multi-user environments where each request carries a different JWT, bind the user token to the execution context using Python's `contextvars`:

```python
from contextvars import ContextVar
from langchain_core.tools import tool

_current_user_jwt: ContextVar[str] = ContextVar("user_jwt", default="")

@tool
def governed_query(query: str) -> str:
    """Runs a governed query with the current user's JWT."""
    jwt = _current_user_jwt.get()
    if not jwt:
        raise ValueError("No user JWT in context — cannot make governed call")
    return zone2_gateway.call(query, jwt=jwt)

async def handle_request(user_prompt: str, user_jwt: str) -> str:
    token = _current_user_jwt.set(user_jwt)  # bind for this call
    try:
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=user_prompt)]},
            config={"configurable": {"thread_id": generate_thread_id()}},
        )
        return result["messages"][-1].content
    finally:
        _current_user_jwt.reset(token)  # always clean up
```

The `contextvars` approach is concurrency-safe in Python's async model — each coroutine has its own context. Source pattern: [WebSearch — LangGraph per-call auth contextvars 2025](https://github.com/langchain-ai/langgraph/issues/5990)

### Summary: Choosing a Governance Hook

| Need | Mechanism | Where it runs |
|---|---|---|
| Pause before ALL tool calls for human review | `interrupt_before=["tools"]` | LangGraph routing |
| Selective per-tool approval | `interrupt()` inside tool body | Inside ToolNode execution |
| Fast synchronous policy check (no human) | `post_model_hook` | After model, before routing |
| Audit log every execution | `ToolNode(wrap_tool_call=fn)` | Inside ToolNode, before each tool |
| Per-user identity for all tools | `ToolRuntime` + `context_schema` or `contextvars` | Tool function body |
| Correlation across Zone 1 → Zone 2 → audit | `tool_call_id` via MCP `meta` | End-to-end |

---

## Quick Reference: Zone 1 Recommended Stack

```python
# Zone 1 production wiring (illustrative)
from langgraph.prebuilt import create_react_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_core.messages import trim_messages, SystemMessage
from langgraph.checkpoint.postgres import PostgresSaver  # or SqliteSaver for edge

# 1. Connect to Zone 2 MCP server with auth
client = MultiServerMCPClient({
    "zone2": {
        "transport": "http",
        "url": ZONE2_MCP_URL,
        "headers": {"Authorization": f"Bearer {service_jwt}"},
    }
})

# 2. Discover tools once at startup
async with client:
    tools = await client.get_tools()

# 3. Context trimmer for 4k–8k window
def trim_hook(state: dict) -> dict:
    return {"messages": trim_messages(
        state["messages"],
        strategy="last",
        token_counter=token_counter_fn,
        max_tokens=3000,
        include_system=True,
        start_on="human",
        end_on=("human", "tool"),
        allow_partial=False,
    )}

# 4. Governance gate for high-risk tools
def governance_gate(state: dict) -> dict:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls"):
        for tc in last.tool_calls:
            if tc["name"] in HIGH_RISK_TOOLS:
                decision = interrupt({"tool": tc["name"], "args": tc["args"]})
                if not decision.get("approved"):
                    return {"messages": [AIMessage(content="Action rejected.")]}
    return {}

# 5. Build agent
checkpointer = PostgresSaver.from_conn_string(DB_URL)
agent = create_react_agent(
    model=OllamaModel("gemma4"),
    tools=tools,
    pre_model_hook=trim_hook,
    post_model_hook=governance_gate,
    checkpointer=checkpointer,
    version="v2",
    prompt="You are a clinical assistant. Be concise. Call one tool at a time.",
)

# 6. Invoke with per-user config
result = await agent.ainvoke(
    {"messages": [HumanMessage(content=user_query)]},
    config={
        "configurable": {
            "thread_id": session_id,
            "user_jwt": user_jwt,
            "user_id": user_id,
        },
        "recursion_limit": 20,
    },
)
```

---

## Sources

- [LangChain Reference — create_react_agent](https://reference.langchain.com/python/langgraph.prebuilt/chat_agent_executor/create_react_agent)
- [LangChain Reference — ToolRuntime](https://reference.langchain.com/python/langgraph.prebuilt/tool_node/ToolRuntime)
- [DeepWiki — LangGraph ReAct Agent (create_react_agent)](https://deepwiki.com/langchain-ai/langgraph/8.1-react-agent-(create_react_agent))
- [DeepWiki — ToolNode and Tool Execution](https://deepwiki.com/langchain-ai/langgraph/8.2-toolnode-and-tool-execution)
- [LangChain Blog — Making it easier to build HITL agents with interrupt](https://www.langchain.com/blog/making-it-easier-to-build-human-in-the-loop-agents-with-interrupt)
- [LangChain Docs — GRAPH_RECURSION_LIMIT](https://docs.langchain.com/oss/python/langgraph/errors/GRAPH_RECURSION_LIMIT)
- [FastMCP Docs — The FastMCP Client](https://gofastmcp.com/clients/client)
- [FastMCP Docs — Calling Tools](https://gofastmcp.com/clients/tools)
- [PyPI — fastmcp 3.4.6](https://pypi.org/project/fastmcp/)
- [PyPI — langchain-mcp-adapters 0.3.2](https://pypi.org/project/langchain-mcp-adapters/)
- [GitHub — langchain-ai/langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters)
- [GitHub — langgraph graph/message.py](https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/langgraph/graph/message.py)
- [Vadym Barda on X — pre_model_hook for trimming](https://x.com/vadymbarda/status/1907831299487748191)
- [Focused.io — Streaming LangGraph Agents](https://focused.io/lab/streaming-agent-state-with-langgraph)
- [Dativo — Controlling LangGraph Tool Calls](https://blog.dativo.io/p/controlling-langgraph-tool-calls)
- [AgentsIndex — LangGraph Tutorial v1.0 API](https://agentsindex.ai/blog/langgraph-tutorial)
- [machinelearningplus — LangGraph Memory Systems](https://machinelearningplus.com/gen-ai/langgraph-memory-systems-short-long-term-conversation/)
- [IdeenTech — Short-Term Memory in LangGraph](https://ideentech.com/understanding-short-term-memory-in-langgraph-a-hands-on-guide/)
- [C# Corner — Context Window Limits in LangGraph](https://www.c-sharpcorner.com/article/context-window-limits-in-langgraph-with-real-time-use-case/)
- [Agentic Control Plane — Governed LangGraph in Three Minutes](https://agenticcontrolplane.com/blog/governed-langgraph-in-three-minutes)
- [DeepWiki — Streaming Events and Modes](https://deepwiki.com/langchain-ai/langchain-academy/6.3-streaming-events-and-modes)
