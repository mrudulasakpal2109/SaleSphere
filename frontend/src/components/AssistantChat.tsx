import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { apiGet, apiStream } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { productsQueryString } from "@/lib/catalog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import type { ProductListResponse } from "@/types";
import type { ChatMessage, ConversationOut, StreamEvent } from "@/managerTypes";

const CONV_KEY = "salesphere_assistant_conv";
const TAG = /\[\[product:([a-f0-9-]{36})\]\]/g;
const SUGGESTIONS = ["Diwali outfit ideas for women", "Gift for a 5-year-old boy", "Smart casual look for men"];

function productIds(text: string): string[] {
  return [...new Set([...text.matchAll(TAG)].map((m) => m[1]))];
}

function ProductChips({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  const { data } = useQuery({
    queryKey: ["assistant-products", key],
    queryFn: () => apiGet<ProductListResponse>(`/products?${productsQueryString({ ids: key, limit: 8 })}`),
    enabled: ids.length > 0,
  });
  if (!data?.items.length) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {data.items.map((p) => (
        <Link key={p.id} to={`/product/${p.id}`} data-testid={`assistant-product-${p.sku}`} className="group flex flex-col border border-border bg-background transition hover:border-foreground">
          <div className="aspect-[4/5] overflow-hidden bg-secondary">
            <ImageWithFallback src={p.images[0] ?? ""} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          </div>
          <p className="line-clamp-2 px-2 pt-1.5 text-xs font-medium leading-snug">{p.name}</p>
          <p className="px-2 pb-2 font-mono text-xs">{formatINR(p.price)}</p>
        </Link>
      ))}
    </div>
  );
}

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(() => localStorage.getItem(CONV_KEY));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore the saved conversation the first time the panel opens.
  const restored = useQuery({
    queryKey: ["assistant-conversation", convId],
    queryFn: () => apiGet<ConversationOut>(`/assistant/conversations/${convId}`),
    enabled: open && !!convId && messages.length === 0,
    retry: false,
  });
  useEffect(() => {
    if (restored.data && messages.length === 0) setMessages(restored.data.messages);
  }, [restored.data, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    try {
      await apiStream<StreamEvent>("/assistant/chat", { message: msg, conversation_id: convId }, (ev) => {
        if (ev.type === "start") {
          setConvId(ev.conversation_id);
          localStorage.setItem(CONV_KEY, ev.conversation_id);
        } else if (ev.type === "delta") {
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + ev.text };
            return next;
          });
        } else if (ev.type === "error") {
          setError(ev.message);
        }
      });
    } catch {
      setError("The style assistant is unavailable right now. Please try again shortly.");
    } finally {
      setMessages((m) => (m[m.length - 1]?.content ? m : m.slice(0, -1)));
      setBusy(false);
    }
  };

  const rendered = useMemo(
    () => messages.map((m) => ({ ...m, text: m.content.replace(TAG, "").replace(/\n{3,}/g, "\n\n").trim(), ids: productIds(m.content) })),
    [messages],
  );

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="assistant-open-button"
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-white shadow-lg transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-sale lg:bottom-6 lg:right-6"
        >
          <MessageCircle size={17} /> Style assistant
        </button>
      )}
      {open && (
        <section
          aria-label="Salesphere style assistant"
          data-testid="assistant-panel"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[80svh] flex-col border border-border bg-card shadow-2xl animate-fade-up sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:w-[400px]"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="flex items-center gap-1.5 font-heading text-lg font-medium"><Sparkles size={15} className="text-sale" /> Style Assistant</p>
              <p className="text-[11px] text-muted-foreground">AI suggestions from the Salesphere catalogue · powered by Claude</p>
            </div>
            <button type="button" aria-label="Close assistant" data-testid="assistant-close-button" onClick={() => setOpen(false)} className="p-1.5 transition hover:text-sale">
              <X size={18} />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" data-testid="assistant-messages">
            {rendered.length === 0 && (
              <div className="text-sm text-muted-foreground">
                <p>Hi! Tell me the occasion, budget or style and I'll pick pieces from the store.</p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} data-testid={`assistant-suggestion-${s.split(" ")[0].toLowerCase()}`} className="border border-border px-3 py-1.5 text-left text-xs text-foreground transition hover:border-foreground">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {rendered.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""} data-testid={`assistant-message-${m.role}`}>
                <div className={`max-w-[90%] whitespace-pre-line text-sm leading-relaxed ${m.role === "user" ? "bg-foreground px-3 py-2 text-white" : ""}`}>
                  {m.text || (busy && i === rendered.length - 1 ? <span className="animate-pulse text-muted-foreground">Styling your picks…</span> : null)}
                  {m.role === "assistant" && m.ids.length > 0 && <ProductChips ids={m.ids} />}
                </div>
              </div>
            ))}
            {error && <p className="text-xs text-destructive" role="alert" data-testid="assistant-error">{error}</p>}
          </div>

          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="assistant-input" className="sr-only">Message the style assistant</label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. wedding guest look under ₹4,000"
              maxLength={1000}
              data-testid="assistant-input"
              className="h-10 flex-1 border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" data-testid="assistant-send-button" className="flex h-10 w-10 items-center justify-center bg-foreground text-white transition-colors hover:bg-sale disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
