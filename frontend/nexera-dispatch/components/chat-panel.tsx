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
          <Bot size={16} className="text-indigo-400" />
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
            <div className="max-w-[85%] space-y-1">
              {msg.toolSteps && msg.toolSteps.length > 0 && (
                <div className="space-y-0.5">
                  {msg.toolSteps.map((step, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench size={10} className="text-indigo-400 flex-shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {msg.content && (
                <div className={`rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-secondary text-foreground rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-indigo-400" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}

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
        <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0" onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
