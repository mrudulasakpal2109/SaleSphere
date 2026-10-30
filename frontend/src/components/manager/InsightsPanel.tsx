import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiStream } from "@/lib/api";
import type { StreamEvent } from "@/managerTypes";

// Claude-written plain-English summary of the live dashboard metrics (manager only).
export function InsightsPanel() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setText("");
    setError(null);
    setBusy(true);
    try {
      await apiStream<StreamEvent>("/manager/insights", {}, (ev) => {
        if (ev.type === "delta") setText((t) => t + ev.text);
        if (ev.type === "error") setError(ev.message);
      });
    } catch {
      setError("Insights are unavailable right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border border-border bg-card p-5" data-testid="manager-insights-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl font-medium"><Sparkles size={16} className="text-sale" /> AI Insights</h2>
          <p className="text-xs text-muted-foreground">Claude summarises the live figures on this page. It only uses numbers from your data.</p>
        </div>
        <Button size="sm" onClick={run} disabled={busy} data-testid="manager-insights-generate-button">
          {busy ? "Analysing…" : text ? "Regenerate" : "Generate insights"}
        </Button>
      </div>
      {(text || busy) && (
        <div className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed" data-testid="manager-insights-text" aria-live="polite">
          {text || <span className="animate-pulse text-muted-foreground">Reading the numbers…</span>}
        </div>
      )}
      {error && <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>}
    </section>
  );
}
