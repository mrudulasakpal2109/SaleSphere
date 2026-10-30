import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sizeChartsFor } from "@/lib/sizeGuide";

export function SizeGuideDialog({ category, subcategory, selected }: { category: string; subcategory: string; selected: string | null }) {
  const charts = sizeChartsFor(category, subcategory);
  if (charts.length === 0) return null;
  return (
    <Dialog>
      <DialogTrigger
        data-testid="size-guide-button"
        className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-4 transition-colors hover:text-sale"
      >
        <Ruler size={14} /> Size guide
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl" data-testid="size-guide-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Size Guide</DialogTitle>
          <DialogDescription>Body measurements. If you're between sizes, size up for a relaxed fit.</DialogDescription>
        </DialogHeader>
        <div className="space-y-8">
          {charts.map((chart) => (
            <section key={chart.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em]">{chart.title}</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm" data-testid="size-guide-table">
                  <thead>
                    <tr className="border-b border-foreground">
                      {chart.columns.map((c) => (
                        <th key={c} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((row) => (
                      <tr key={row[0]} className={`border-b border-border ${row[0] === selected ? "bg-secondary font-medium" : ""}`}>
                        {row.map((cell, i) => (
                          <td key={i} className={`px-3 py-2 ${i === 0 ? "font-mono" : ""}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{chart.note}</p>
            </section>
          ))}
          <p className="border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
            How to measure: use a soft tape, keep it snug but not tight, and measure over light clothing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
