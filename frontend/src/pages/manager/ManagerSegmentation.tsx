import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Filter,
  HelpCircle,
  Layers,
  Sparkles,
  Target,
  TrendingDown,
  X,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/pages/manager/ManagerOverview";
import type { Dendrogram, RfmResponse } from "@/managerTypes";

const CLUSTER_PALETTE = [
  "#B8860B", // 0: Gold
  "#1E293B", // 1: Navy / Charcoal
  "#C85A32", // 2: Rust Red
  "#0D9488", // 3: Deep Teal
  "#7C3AED", // 4: Purple
  "#DB2777", // 5: Magenta Pink
  "#2563EB", // 6: Royal Blue
  "#059669", // 7: Emerald Green
  "#D97706", // 8: Warm Amber
  "#475569", // 9: Slate Grey
];

function getClusterColor(clusterId: number): string {
  return CLUSTER_PALETTE[clusterId % CLUSTER_PALETTE.length];
}

function DendrogramChart({ d }: { d: Dendrogram }) {
  const W = 900;
  const H = 320;
  const pad = 30;
  const xs = d.icoord.flat();
  const ys = d.dcoord.flat();
  const maxX = Math.max(...xs, 10);
  const maxY = Math.max(...ys, 1);
  const sx = (x: number) => pad + (x / (maxX + 5)) * (W - 2 * pad);
  const sy = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);

  // Cut-off threshold height for 4 clusters (approximately 45% of maxY)
  const cutY = sy(maxY * 0.45);

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H + 60}`}
        className="h-auto w-full"
        role="img"
        aria-label="Hierarchical clustering dendrogram"
        data-testid="segmentation-dendrogram"
      >
        {/* Threshold horizontal line indicating cluster division */}
        <line
          x1={pad}
          y1={cutY}
          x2={W - pad}
          y2={cutY}
          stroke="#C85A32"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <text
          x={W - pad - 120}
          y={cutY - 6}
          fontSize={10}
          fill="#C85A32"
          fontWeight="bold"
        >
          Cut Threshold (K = 4)
        </text>

        {d.icoord.map((ic, i) => (
          <polyline
            key={i}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth={1.4}
            points={ic.map((x, j) => `${sx(x)},${sy(d.dcoord[i][j])}`).join(" ")}
          />
        ))}
        {d.labels.map((l, i) => (
          <text
            key={i}
            x={sx(5 + i * 10)}
            y={H - pad + 12}
            fontSize={9}
            textAnchor="end"
            transform={`rotate(-55 ${sx(5 + i * 10)} ${H - pad + 12})`}
            fill="#5C5650"
          >
            {l}
          </text>
        ))}
        <text x={pad} y={16} fontSize={11} fill="#5C5650" fontWeight="600">
          Ward Linkage Distance Axis
        </text>
      </svg>
    </div>
  );
}

export default function ManagerSegmentation() {
  const [k, setK] = useState<number>(4);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [showTheory, setShowTheory] = useState<boolean>(false);

  const { data, isLoading } = useQuery({
    queryKey: ["manager", "rfm", k],
    queryFn: () => apiGet<RfmResponse>(`/manager/rfm?k=${k}`),
  });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  const ok = data.status === "ok";

  const focusedClusterData =
    selectedCluster !== null
      ? data.kmeans.find((c) => c.cluster === selectedCluster)
      : null;

  const filteredCustomers =
    selectedCluster !== null
      ? data.customers.filter((c) => c.kmeans_cluster === selectedCluster)
      : data.customers;

  // Prepare evaluations data for the Elbow and Silhouette curves
  const evaluations = data.evaluations || [];

  return (
    <div className="space-y-6" data-testid="manager-segmentation-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          overline={`Data Mining Lab · RFM Engine & Customer Segmentation · as of ${data.as_of}`}
          title="Interactive Customer Segmentation Lab"
        />

        {/* Dynamic K Selector (K = 2..10) */}
        <div className="flex flex-wrap items-center gap-1.5 border border-border bg-card p-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Clusters (K):
          </span>
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => {
                setK(num);
                setSelectedCluster(null);
              }}
              className={`flex h-7 w-7 items-center justify-center font-mono text-xs font-bold transition ${
                k === num
                  ? "bg-[#121212] text-white shadow-sm ring-1 ring-black"
                  : "border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
              title={`Compute with K = ${num} clusters`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Customers Analyzed", data.eligible_customers.toLocaleString()],
          ["Completed Purchases", data.completed_orders.toLocaleString()],
          ["Selected Clusters (K)", `${k} ${k === 4 ? "★ (Optimal)" : ""}`],
          ["Silhouette Score", data.silhouette ? data.silhouette.toFixed(4) : "—"],
        ].map(([l, v]) => (
          <div key={String(l)} className="border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {l}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      {!ok && (
        <div
          className="border border-dashed border-foreground/30 bg-card p-6"
          data-testid="segmentation-insufficient"
        >
          <p className="font-heading text-xl">Not enough data to segment yet</p>
          <p className="mt-2 text-sm text-muted-foreground">{data.message}</p>
        </div>
      )}

      {ok && (
        <>
          {/* SECTION 1: CHOOSING THE OPTIMAL NUMBER OF CLUSTERS (ELBOW & SILHOUETTE) */}
          <section
            className="border border-border bg-card p-5 shadow-sm space-y-5"
            data-testid="optimal-k-section"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingDown size={18} className="text-sale" />
                  <h2 className="font-heading text-lg font-bold text-foreground">
                    Choosing the Optimal Number of Clusters
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Elbow Method (Inertia / Within-Cluster Sum of Squares) & Silhouette Coefficient Validation across K = 2..10.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-sale/10 text-sale px-2 py-0.5 rounded font-semibold">
                  Active K = {k}
                </span>
                <span className="text-xs font-mono bg-muted text-foreground px-2 py-0.5 rounded">
                  Default K = 4 (Elbow Inflection)
                </span>
              </div>
            </div>

            {/* Dual Evaluation Curves: Left (Elbow) / Right (Silhouette) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Elbow Curve (Inertia / WCSS) */}
              <div className="border border-border bg-background p-4 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Elbow Curve: Inertia (WCSS) vs K
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Click point to switch K</span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={evaluations}
                      margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload[0]) {
                          setK(e.activePayload[0].payload.k);
                        }
                      }}
                    >
                      <CartesianGrid stroke="#E8E2D9" strokeDasharray="3 3" />
                      <XAxis dataKey="k" fontSize={11} unit=" clusters" />
                      <YAxis
                        fontSize={10}
                        domain={["auto", "auto"]}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        formatter={(val: number) => [`${val.toLocaleString()} (Inertia)`, "WCSS"]}
                        labelFormatter={(lbl) => `K = ${lbl} Clusters`}
                      />
                      <ReferenceLine x={4} stroke="#C85A32" strokeDasharray="3 3" label={{ value: "Inflection (K=4)", fill: "#C85A32", fontSize: 10, position: "top" }} />
                      <Line
                        type="monotone"
                        dataKey="inertia"
                        stroke="#121212"
                        strokeWidth={2}
                        dot={{ r: 4, stroke: "#121212", strokeWidth: 1.5, fill: "#FAF8F5" }}
                        activeDot={{ r: 7, fill: "#C85A32" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Inertia drops steeply from 9,815.7 (K=2) down to 5,610.5 (K=4). Beyond K=4, the marginal rate of variance reduction diminishes significantly.
                </p>
              </div>

              {/* Silhouette Score Curve */}
              <div className="border border-border bg-background p-4 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Silhouette Score vs K
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Higher = tighter cluster separation</span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={evaluations}
                      margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload[0]) {
                          setK(e.activePayload[0].payload.k);
                        }
                      }}
                    >
                      <CartesianGrid stroke="#E8E2D9" strokeDasharray="3 3" />
                      <XAxis dataKey="k" fontSize={11} unit=" clusters" />
                      <YAxis
                        fontSize={10}
                        domain={[0.2, 0.45]}
                        tickFormatter={(v: number) => v.toFixed(2)}
                      />
                      <Tooltip
                        formatter={(val: number) => [val.toFixed(4), "Silhouette Score"]}
                        labelFormatter={(lbl) => `K = ${lbl} Clusters`}
                      />
                      <ReferenceLine x={4} stroke="#B8860B" strokeDasharray="3 3" label={{ value: "K=4 (0.2883)", fill: "#B8860B", fontSize: 10, position: "top" }} />
                      <Line
                        type="monotone"
                        dataKey="silhouette_score"
                        stroke="#0D9488"
                        strokeWidth={2}
                        dot={{ r: 4, stroke: "#0D9488", strokeWidth: 1.5, fill: "#FAF8F5" }}
                        activeDot={{ r: 7, fill: "#B8860B" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Scores range between 0.2568 and 0.3818. K=4 achieves a solid 0.2883 balance while avoiding the over-consolidation of distinct behavioral personas.
                </p>
              </div>
            </div>

            {/* Academic Explanation Card */}
            <div className="bg-[#FAF8F5] border border-border p-4 rounded-sm space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Target size={14} className="text-sale" />
                Academic Viva Rationale: Why K = 4 Was Selected
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.optimal_k_explanation ||
                  "The Elbow method identifies an inflection point at K=4, where the marginal reduction in within-cluster sum of squares (Inertia) begins to level off (dropping from 9,815.7 at K=2 to 5,610.5 at K=4, after which drops become incremental). While K=2 and K=3 exhibit slightly higher mathematical silhouette coefficients, they merge distinct behavioral personas into overly broad segments. K=4 yields a balanced Silhouette score (0.2883) while separating customers into 4 actionable business segments: VIP Champions, Loyal Regulars, Potential Loyalists / Big Spenders, and At-Risk / Hibernating Shoppers."}
              </p>
            </div>
          </section>

          {/* SECTION 2: INTERACTIVE CLUSTER SELECTOR & CENTROID PROFILES */}
          <section className="border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-sale" />
                <h3 className="text-xs font-bold uppercase tracking-[0.16em]">
                  Interactive Persona Explorer — Click Any Cluster to Filter & Inspect
                </h3>
              </div>
              {selectedCluster !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedCluster(null)}
                  className="flex items-center gap-1 border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
                >
                  <X size={12} /> Show All Clusters
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {data.kmeans.map((c) => {
                const color = getClusterColor(c.cluster);
                const isSelected = selectedCluster === c.cluster;
                return (
                  <button
                    key={c.cluster}
                    type="button"
                    onClick={() =>
                      setSelectedCluster(isSelected ? null : c.cluster)
                    }
                    className={`flex items-center gap-2 border px-3 py-2 text-xs font-medium transition ${
                      isSelected
                        ? "border-foreground bg-[#FAF8F5] shadow-sm ring-1 ring-foreground"
                        : "border-border bg-background hover:border-foreground"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span>
                      Cluster {c.cluster}: <strong>{c.label}</strong>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      ({c.size} cust. · {c.percentage || Math.round((c.size / data.eligible_customers) * 100)}%)
                    </span>
                    <ChevronRight size={13} className="text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Focused Cluster Detail Box when a cluster is clicked */}
          {focusedClusterData && (
            <div
              className="border-2 border-foreground bg-card p-6 shadow-md animate-fade-up"
              style={{
                borderLeftColor: getClusterColor(focusedClusterData.cluster),
                borderLeftWidth: "8px",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{
                        background: getClusterColor(focusedClusterData.cluster),
                      }}
                    />
                    <p className="font-heading text-2xl font-bold">
                      Cluster {focusedClusterData.cluster}: {focusedClusterData.label}
                    </p>
                  </div>
                  {focusedClusterData.tagline && (
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {focusedClusterData.tagline}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      Customers & Share
                    </p>
                    <p className="font-mono text-xl font-bold">
                      {focusedClusterData.size.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({focusedClusterData.percentage || Math.round((focusedClusterData.size / data.eligible_customers) * 100)}%)
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCluster(null)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Cluster RFM Centroids: Comparing Original Units vs Normalized Z-scores */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 border-y border-border py-3">
                <div className="bg-background p-3 rounded-sm border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Recency
                    </span>
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                      z_R = {focusedClusterData.centroid_recency_scaled ?? "—"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold">
                    {focusedClusterData.avg_recency} days{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (med: {focusedClusterData.median_recency ?? focusedClusterData.avg_recency}d)
                    </span>
                  </p>
                </div>

                <div className="bg-background p-3 rounded-sm border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Frequency
                    </span>
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                      z_F = {focusedClusterData.centroid_frequency_scaled ?? "—"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold">
                    {focusedClusterData.avg_frequency} orders{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (med: {focusedClusterData.median_frequency ?? focusedClusterData.avg_frequency})
                    </span>
                  </p>
                </div>

                <div className="bg-background p-3 rounded-sm border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Net Monetary
                    </span>
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                      z_M = {focusedClusterData.centroid_monetary_scaled ?? "—"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-lg font-bold">
                    {formatINR(focusedClusterData.avg_monetary)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (med: {formatINR(focusedClusterData.median_monetary ?? focusedClusterData.avg_monetary)})
                    </span>
                  </p>
                </div>
              </div>

              {/* Recommended Business Actions */}
              {focusedClusterData.recommended_actions &&
                focusedClusterData.recommended_actions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tailored Marketing & Business Actions:
                    </p>
                    <ul className="mt-2 space-y-1.5 pl-2 text-sm">
                      {focusedClusterData.recommended_actions.map(
                        (action, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2
                              size={15}
                              className="mt-0.5 shrink-0 text-sale"
                            />
                            <span>{action}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* SECTION 3: COMPREHENSIVE CLUSTER PROFILES TABLE (DISTINGUISHING NORMALIZED VS ORIGINAL UNITS) */}
          <section className="border border-border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold">
                  Cluster Statistical Profiles & Standardized Centroids (K = {k})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Distinguishing normalized feature space coordinates (z_R, z_F, z_M) from original units (days, distinct order count, and realized ₹ spend).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-border">
                <thead className="bg-[#FAF8F5] border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3">Cluster ID & Persona</th>
                    <th className="p-3 text-right">Size</th>
                    <th className="p-3 text-right">Share %</th>
                    <th className="p-3 text-right">Recency (Avg / Med)</th>
                    <th className="p-3 text-right">Frequency (Avg / Med)</th>
                    <th className="p-3 text-right">Monetary (Avg / Med)</th>
                    <th className="p-3 text-center">Scaled Centroid (z_R, z_F, z_M)</th>
                    <th className="p-3">Target Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  {data.kmeans.map((c) => {
                    const color = getClusterColor(c.cluster);
                    const isSelected = selectedCluster === c.cluster;
                    return (
                      <tr
                        key={c.cluster}
                        onClick={() => setSelectedCluster(isSelected ? null : c.cluster)}
                        className={`cursor-pointer transition hover:bg-muted/30 ${
                          isSelected ? "bg-sale/5 font-semibold" : ""
                        }`}
                      >
                        <td className="p-3 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: color }}
                          />
                          <div>
                            <span className="font-bold">Cluster {c.cluster}</span>
                            <span className="block text-[11px] text-muted-foreground font-normal">
                              {c.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {c.size.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {c.percentage || Math.round((c.size / data.eligible_customers) * 100)}%
                        </td>
                        <td className="p-3 text-right font-mono">
                          {c.avg_recency}d /{" "}
                          <span className="text-muted-foreground">
                            {c.median_recency ?? c.avg_recency}d
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {c.avg_frequency} /{" "}
                          <span className="text-muted-foreground">
                            {c.median_frequency ?? c.avg_frequency}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-medium">
                          {formatINR(c.avg_monetary)} /{" "}
                          <span className="text-muted-foreground text-[11px]">
                            {formatINR(c.median_monetary ?? c.avg_monetary)}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-[11px]">
                          <span className="bg-muted px-2 py-0.5 rounded">
                            ({c.centroid_recency_scaled ?? "0.00"},{" "}
                            {c.centroid_frequency_scaled ?? "0.00"},{" "}
                            {c.centroid_monetary_scaled ?? "0.00"})
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-muted-foreground max-w-xs truncate">
                          {c.tagline || (c.recommended_actions ? c.recommended_actions[0] : "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 4: SCATTER CHARTS & SEGMENT SIZES */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Recency vs Monetary Scatter */}
            <section
              className="border border-border bg-card p-5 shadow-sm space-y-3"
              data-testid="segmentation-scatter"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold">
                    Recency vs Monetary (Net Sales ₹)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Cross-scatter of customer spend against days elapsed since latest purchase.
                  </p>
                </div>
                {selectedCluster !== null && (
                  <span className="text-xs font-semibold text-sale">
                    Filtered: Cluster {selectedCluster}
                  </span>
                )}
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#E8E2D9" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="recency_days"
                      name="Recency"
                      unit="d"
                      fontSize={11}
                    />
                    <YAxis
                      type="number"
                      dataKey="monetary"
                      name="Monetary"
                      fontSize={11}
                      tickFormatter={(v: number) => `₹${v}`}
                    />
                    <ZAxis
                      type="number"
                      dataKey="frequency"
                      range={[25, 180]}
                      name="Frequency"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ payload }) => {
                        if (!payload || !payload.length) return null;
                        const c = payload[0].payload;
                        return (
                          <div className="border border-border bg-popover p-2 text-xs shadow-md">
                            <p className="font-bold">{c.name}</p>
                            <p className="text-muted-foreground">
                              Cluster: {c.kmeans_cluster} ({c.segment ?? "—"})
                            </p>
                            <p>
                              Recency: {c.recency_days}d · Frequency: {c.frequency} · Spend: {formatINR(c.monetary)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      data={data.customers}
                      onClick={(node: any) => {
                        if (node && typeof node.kmeans_cluster === "number") {
                          setSelectedCluster(node.kmeans_cluster);
                        }
                      }}
                      cursor="pointer"
                    >
                      {data.customers.map((c) => {
                        const cl = c.kmeans_cluster ?? 0;
                        const isDimmed =
                          selectedCluster !== null && selectedCluster !== cl;
                        return (
                          <Cell
                            key={c.key}
                            fill={getClusterColor(cl)}
                            opacity={isDimmed ? 0.12 : 0.85}
                            stroke={isDimmed ? "none" : "#121212"}
                            strokeWidth={selectedCluster === cl ? 1.5 : 0.5}
                          />
                        );
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
                <span>Displaying sample of 200 customers across clusters for instant 60 FPS responsiveness.</span>
                <span className="font-mono">Total Base: {data.eligible_customers.toLocaleString()} customers</span>
              </div>
            </section>

            {/* Segment Sizes Bar Chart */}
            <section
              className="border border-border bg-card p-5 shadow-sm space-y-3"
              data-testid="segmentation-sizes"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold">
                    Cluster Customer Distribution (K = {k})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Proportion of customer population allocated to each behavioral segment.
                  </p>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.kmeans} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      stroke="#E8E2D9"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="cluster"
                      tickFormatter={(cl) => `C${cl}`}
                      fontSize={11}
                    />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip
                      formatter={(val, _name, item: any) => [
                        `${val} customers (${item.payload.label})`,
                        "Size",
                      ]}
                    />
                    <Bar
                      dataKey="size"
                      name="Customers"
                      onClick={(entry: any) => {
                        if (entry && typeof entry.cluster === "number") {
                          setSelectedCluster(entry.cluster);
                        }
                      }}
                      cursor="pointer"
                    >
                      {data.kmeans.map((c) => (
                        <Cell
                          key={c.cluster}
                          fill={getClusterColor(c.cluster)}
                          opacity={
                            selectedCluster === null || selectedCluster === c.cluster
                              ? 1
                              : 0.3
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap gap-2 text-xs border-t border-border pt-2">
                {data.kmeans.map((c) => (
                  <button
                    key={c.cluster}
                    type="button"
                    onClick={() =>
                      setSelectedCluster(
                        selectedCluster === c.cluster ? null : c.cluster
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
                      selectedCluster === c.cluster
                        ? "bg-foreground text-background font-semibold"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: getClusterColor(c.cluster) }}
                    />
                    <span>
                      C{c.cluster}: {c.label} ({c.percentage || Math.round((c.size / data.eligible_customers) * 100)}%)
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* SECTION 5: HIERARCHICAL CLUSTERING & DENDROGRAM */}
          {data.dendrogram && (
            <section className="border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="font-heading text-lg font-bold">
                    Hierarchical Agglomerative Clustering (Ward Linkage Dendrogram)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tree visualization showing bottom-up cluster fusion based on minimum-variance linkage.
                  </p>
                </div>
                <span className="text-xs font-mono bg-muted text-foreground px-2 py-0.5 rounded">
                  Method: Ward Linkage · Distance: Euclidean
                </span>
              </div>

              <DendrogramChart d={data.dendrogram} />

              <div className="bg-[#FAF8F5] border border-border p-3.5 rounded-sm space-y-1.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">
                  How to Interpret the Dendrogram in a Viva:
                </p>
                <p className="leading-relaxed">
                  Each leaf at the bottom represents an individual customer vector in standardized 3D RFM space. Moving vertically up the tree, customers and clusters that minimize the increase in total within-cluster variance (Ward's criterion) merge together. The dashed red line illustrates where cutting the dendrogram horizontally partitions the customer population into <strong>4 macro segments</strong>.
                </p>
              </div>
            </section>
          )}

          {/* SECTION 6: COLLAPSIBLE ACADEMIC ALGORITHM VIVA GUIDE */}
          <section className="border border-border bg-card p-5 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => setShowTheory(!showTheory)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-sale" />
                <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-sale transition">
                  How the Data Mining Algorithms Work (Academic Viva Explanation)
                </h3>
              </div>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform ${showTheory ? "rotate-180" : ""}`}
              />
            </button>

            {showTheory && (
              <div className="pt-3 border-t border-border space-y-4 text-xs text-muted-foreground animate-fade-down">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border p-3.5 bg-background space-y-1.5">
                    <p className="font-bold text-foreground text-sm">1. RFM Preprocessing & Feature Engineering</p>
                    <p className="leading-relaxed">
                      • <strong>Recency (R):</strong> Days elapsed between customer's latest order and dataset reference date (Reference Date = max(OrderDate) + 1 day).
                    </p>
                    <p className="leading-relaxed">
                      • <strong>Frequency (F):</strong> Count of DISTINCT orders placed (<span className="font-mono">order_id.nunique()</span>), strictly preventing line-item basket inflation.
                    </p>
                    <p className="leading-relaxed">
                      • <strong>Monetary (M):</strong> Realized net spend across delivered items after full deduction of refund amounts on returned items.
                    </p>
                  </div>

                  <div className="border border-border p-3.5 bg-background space-y-1.5">
                    <p className="font-bold text-foreground text-sm">2. Feature Scaling & Skewness Mitigation</p>
                    <p className="leading-relaxed">
                      Raw e-commerce spend and frequency exhibit heavy right-skewed Pareto distributions. We apply:
                    </p>
                    <p className="font-mono bg-muted p-1 text-[11px] text-foreground rounded">
                      x_scaled = (log(1 + x) - μ) / σ
                    </p>
                    <p className="leading-relaxed">
                      This log1p transformation compresses exponential tails, followed by <span className="font-semibold">StandardScaler</span> (z-score normalization with mean=0, std=1) so distance metrics treat Recency, Frequency, and Monetary on equal mathematical footing.
                    </p>
                  </div>

                  <div className="border border-border p-3.5 bg-background space-y-1.5">
                    <p className="font-bold text-foreground text-sm">3. K-Means Clustering Formulation</p>
                    <p className="leading-relaxed">
                      K-Means partitions N customers into K clusters by minimizing the within-cluster sum of squares (WCSS / Inertia):
                    </p>
                    <p className="font-mono bg-muted p-1 text-[11px] text-foreground rounded">
                      J = Σ (k=1..K) Σ (x ∈ C_k) ||x - μ_k||²
                    </p>
                    <p className="leading-relaxed">
                      Iterative Lloyd's algorithm assigns each customer to the closest centroid μ_k and recalculates centroids until convergence.
                    </p>
                  </div>

                  <div className="border border-border p-3.5 bg-background space-y-1.5">
                    <p className="font-bold text-foreground text-sm">4. Silhouette Coefficient & Ward Linkage</p>
                    <p className="leading-relaxed">
                      • <strong>Silhouette Score s(i):</strong> Measures how well sample i matches its own cluster versus the nearest neighboring cluster:
                    </p>
                    <p className="font-mono bg-muted p-1 text-[11px] text-foreground rounded">
                      s(i) = (b(i) - a(i)) / max(a(i), b(i))
                    </p>
                    <p className="leading-relaxed">
                      • <strong>Ward Linkage:</strong> Agglomerative clustering that merges the pair of clusters with minimal increase in total within-cluster variance (ΔESS).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 7: CUSTOMER RFM DATA TABLE */}
          {filteredCustomers.length > 0 && (
            <section
              className="overflow-x-auto border border-border bg-card shadow-sm"
              data-testid="segmentation-rfm-table"
            >
              <div className="flex items-center justify-between border-b border-border bg-[#EFECE6]/50 p-3.5">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {selectedCluster !== null
                      ? `Customers in Cluster ${selectedCluster} (${filteredCustomers.length} displayed)`
                      : `Analyzed Customer Sample (${filteredCustomers.length} displayed)`}
                  </p>
                </div>
                {selectedCluster !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedCluster(null)}
                    className="text-xs text-sale underline font-medium"
                  >
                    Reset Filter (Show All)
                  </button>
                )}
              </div>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-3">Customer</th>
                    <th className="text-right">Recency</th>
                    <th className="text-right">Frequency</th>
                    <th className="text-right">Monetary</th>
                    <th className="text-right">RFM Score</th>
                    <th className="p-3 text-center">K-Means Cluster</th>
                    <th className="p-3">Persona Segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCustomers.map((c) => {
                    const cl = c.kmeans_cluster ?? 0;
                    return (
                      <tr key={c.key} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <span className="font-medium">{c.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {c.email}
                          </span>
                        </td>
                        <td className="text-right font-mono">{c.recency_days}d</td>
                        <td className="text-right font-mono">{c.frequency}</td>
                        <td className="text-right font-mono font-medium">
                          {formatINR(c.monetary)}
                        </td>
                        <td className="text-right font-mono">{c.rfm_score}</td>
                        <td className="p-3 text-center">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold"
                            style={{
                              background: `${getClusterColor(cl)}20`,
                              color: getClusterColor(cl),
                            }}
                          >
                            C{cl}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{c.segment ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* SECTION 8: METHODOLOGY & CALCULATION RULES */}
          <section className="border border-border bg-card p-5" data-testid="segmentation-rules">
            <h2 className="font-heading text-lg font-bold">
              Data Mining & Calculation Rules
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
              {data.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
