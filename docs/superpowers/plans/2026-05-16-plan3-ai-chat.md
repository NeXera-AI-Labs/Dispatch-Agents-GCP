# Plan 3: AI Chat Panel — Wired to Agents Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat placeholder in the dispatcher dashboard with a working floating AI chat panel that sends messages to the existing LangGraph agents backend and renders responses with tool-call visibility.

**Architecture:** The agents backend (`/chat` endpoint on Cloud Run) already works — it takes `{ thread_id, message }` and returns `{ reply, pending_action }`. The frontend opens a floating panel, maintains a `thread_id` per session, and POST-polls the endpoint. No streaming for hackathon — fetch response and display. Tool call steps are shown as inline "thinking" lines parsed from the reply text.

**Tech Stack:** React (Next.js App Router, client component), plain `fetch`, no Vercel AI SDK. CORS is already open on the agents backend.

**Prerequisites:** Plan 2 Task 7 (dispatcher dashboard with chat placeholder) must be complete.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `frontend/nexera-dispatch/lib/api.ts` | **Modify** | Add `sendChat()` function |
| `frontend/nexera-dispatch/components/chat-panel.tsx` | **Create** | Floating AI chat panel component |
| `frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx` | **Modify** | Replace chat placeholder with `<ChatPanel>` |
| `agents/main.py` | **Modify** | Add `tenant_id` + `warehouse_number` to `ChatRequest`, pass to agent context |

---

## Task 1: Add sendChat to API client

**Files:**
- Modify: `frontend/nexera-dispatch/lib/api.ts`

- [ ] **Step 1: Add sendChat function to api.ts**

Open `frontend/nexera-dispatch/lib/api.ts` and add at the end of the file:

```typescript
// ── AI Chat ───────────────────────────────────────────────────────────

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL!;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolSteps?: string[];
}

export interface ChatApiResponse {
  reply: string;
  pending_action: { description: string; action: string } | null;
}

export async function sendChat(
  threadId: string,
  message: string,
  warehouseNumber: string,
  confirm?: boolean
): Promise<ChatApiResponse> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body: Record<string, unknown> = { thread_id: threadId, message, warehouse_number: warehouseNumber };
  if (confirm !== undefined) body['confirm'] = confirm;

  const res = await fetch(`${AGENTS_URL}/chat`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Chat request failed');
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/nexera-dispatch/lib/api.ts
git commit -m "feat: add sendChat API function for agents backend"
```

---

## Task 2: Update agents /chat endpoint to accept warehouse_number

**Files:**
- Modify: `agents/main.py`

The agents backend currently only takes `thread_id` and `message`. We need to pass `warehouse_number` through so agents can scope their OData queries correctly.

- [ ] **Step 1: Update ChatRequest model in main.py**

Open `agents/main.py`. Find the `ChatRequest` class (around line 55) and replace it:

```python
class ChatRequest(BaseModel):
    thread_id: str
    message: str
    warehouse_number: str | None = None
    confirm: bool | None = None
```

- [ ] **Step 2: Update the /chat endpoint to pass warehouse_number into the graph config**

Find the `@app.post("/chat")` endpoint handler. It should look like this (add `warehouse_number` to the config dict):

```python
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    config = {
        "configurable": {
            "thread_id": req.thread_id,
            "warehouse_number": req.warehouse_number or "0001",
        }
    }
    if req.confirm is not None:
        result = _graph.invoke(Command(resume=req.confirm), config=config)
    else:
        result = _graph.invoke({"message": req.message}, config=config)

    messages = result.get("messages", [])
    last = messages[-1] if messages else None
    reply = getattr(last, "content", "") if last else ""

    pending = result.get("pending_action")
    return ChatResponse(reply=reply, pending_action=pending)
```

- [ ] **Step 3: Test agents locally**

```bash
cd agents
PYTHONPATH=. uvicorn main:app --reload --port 8000
```

```bash
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"thread_id":"test-1","message":"list open deliveries","warehouse_number":"0001"}' | python3 -m json.tool
```

Expected: `{ "reply": "...", "pending_action": null }`

- [ ] **Step 4: Commit and deploy agents**

```bash
git add agents/main.py
git commit -m "feat: add warehouse_number to /chat request for agent scoping"

cd agents
gcloud run deploy agents --source . --region us-central1 --project agentic-dispatch
```

---

## Task 3: Build floating chat panel component

**Files:**
- Create: `frontend/nexera-dispatch/components/chat-panel.tsx`

- [ ] **Step 1: Create chat-panel.tsx**

File: `frontend/nexera-dispatch/components/chat-panel.tsx`

```tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendChat, type ChatMessage } from '@/lib/api';
import { Bot, Send, X, Loader2, Wrench } from 'lucide-react';

interface ChatPanelProps {
  warehouseNumber: string;
  onClose: () => void;
}

// Parse inline tool step lines from agent reply
// Convention: lines starting with "→" or "[tool:" are tool steps
function parseReply(raw: string): { text: string; toolSteps: string[] } {
  const lines = raw.split('\n');
  const toolSteps: string[] = [];
  const textLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('→') || line.startsWith('[tool:') || line.startsWith('Calling tool')) {
      toolSteps.push(line.replace(/^→\s*/, '').replace(/^\[tool:\s*/, '').replace(/\]$/, ''));
    } else {
      textLines.push(line);
    }
  }
  return { text: textLines.join('\n').trim(), toolSteps };
}

export function ChatPanel({ warehouseNumber, onClose }: ChatPanelProps) {
  const threadId = useRef(`ui-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hi! I can help you with deliveries in warehouse ${warehouseNumber}. What do you need?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ description: string; action: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(message?: string, confirm?: boolean) {
    const text = message ?? input.trim();
    if (!text && confirm === undefined) return;

    if (text) {
      setMessages(m => [...m, { role: 'user', content: text }]);
      setInput('');
    }
    setPendingAction(null);
    setLoading(true);

    try {
      const res = await sendChat(threadId.current, text || '', warehouseNumber, confirm);
      const { text: replyText, toolSteps } = parseReply(res.reply);
      setMessages(m => [...m, { role: 'assistant', content: replyText, toolSteps }]);
      if (res.pending_action) setPendingAction(res.pending_action);
    } catch (err: unknown) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: err instanceof Error ? `Error: ${err.message}` : 'Something went wrong. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  }

  const QUICK_PROMPTS = [
    'List open deliveries',
    'Any delayed deliveries?',
    'Show unassigned deliveries',
  ];

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[560px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-white">NeXera AI</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">WH-{warehouseNumber}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-1`}>
              {/* Tool steps */}
              {msg.toolSteps && msg.toolSteps.length > 0 && (
                <div className="space-y-0.5">
                  {msg.toolSteps.map((step, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench size={10} className="text-purple-400 flex-shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Message bubble */}
              {msg.content && (
                <div className={`rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-secondary text-foreground rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-purple-400" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}

        {/* Pending action confirmation */}
        {pendingAction && (
          <div className="bg-yellow-950/40 border border-yellow-800 rounded-xl p-3 space-y-2">
            <p className="text-xs text-yellow-300 font-medium">Confirm action</p>
            <p className="text-sm text-white">{pendingAction.description}</p>
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-700 hover:bg-green-600 text-xs h-7" onClick={() => handleSend('', true)}>Confirm</Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleSend('', false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts (only shown when no messages after greeting) */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => handleSend(p)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask about deliveries…"
          className="text-sm"
          disabled={loading}
        />
        <Button size="icon" className="bg-purple-600 hover:bg-purple-700 flex-shrink-0" onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/nexera-dispatch/components/chat-panel.tsx
git commit -m "feat: floating AI chat panel with tool-step rendering and pending action confirmation"
```

---

## Task 4: Wire ChatPanel into dispatcher dashboard

**Files:**
- Modify: `frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx`

- [ ] **Step 1: Replace chat placeholder in dispatch/page.tsx**

Open `frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx`.

Add the import at the top (after existing imports):
```tsx
import { ChatPanel } from '@/components/chat-panel';
```

Find the chat placeholder block at the bottom of the JSX — the `{chatOpen && (...)}` block that says "AI chat coming in Plan 3". Replace the entire block with:

```tsx
{chatOpen && (
  <ChatPanel
    warehouseNumber={warehouseNumber}
    onClose={() => setChatOpen(false)}
  />
)}
```

- [ ] **Step 2: Verify in browser**

```bash
cd frontend/nexera-dispatch && npm run dev
```

1. Login as dispatcher → go to `/dashboard/dispatch`
2. Click **Ask AI** in the top nav
3. Chat panel opens in bottom-right corner
4. See greeting message + 3 quick prompt buttons
5. Click "List open deliveries" → sees loading spinner → gets reply from agent
6. Type a message manually → Enter sends it
7. Click × to close panel

- [ ] **Step 3: Commit**

```bash
git add frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx
git commit -m "feat: wire ChatPanel into dispatcher dashboard"
```

---

## Task 5: End-to-end hackathon demo test

This task is a manual walkthrough of the full demo script before submission.

- [ ] **Step 1: Full flow — IT Admin**

1. Go to `/signup`
2. Create company "NeXera Demo Corp" with email `admin@nexera-demo.com`
3. Land on `/dashboard/admin` — see empty connections list
4. Click "Add Connection"
5. Wizard Step 1: name = "SAP S/4 Sandbox", ERP = SAP S/4HANA, URL = `https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV_0001`
6. Wizard Step 2: auth = API Key
7. Wizard Step 3: paste SAP API Business Hub key → click "Test & Save"
8. See: ✓ Authentication successful, warehouses 0001, 0002 discovered
9. Wizard Step 4: enter manager email, click Invite → copy invite URL

- [ ] **Step 2: Full flow — WH Manager**

1. Open invite URL in new tab → `/invite?token=...`
2. Set name + password → create account
3. Land on `/dashboard/warehouse`
4. Click "Edit Profile" → fill in address, coordinates, working hours → save
5. Invite a dispatcher email → copy invite URL

- [ ] **Step 3: Full flow — Dispatcher**

1. Open dispatcher invite → create account
2. Land on `/dashboard/dispatch`
3. See KPI tiles (Open / In Transit / Delayed / Delivered)
4. See delivery table with SAP data
5. Click a delivery → see detail page
6. Fill driver name + mobile → click "Assign Driver & Generate QR"
7. See QR code → click "Copy link"
8. Click "Ask AI" → chat panel opens
9. Type "show me delayed deliveries" → see agent response with delivery data

- [ ] **Step 4: Record demo**

Record a 2–3 min screen walkthrough of steps 1–3 above for the hackathon submission video.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: NeXera Dispatch hackathon MVP complete"
git push origin main
```
