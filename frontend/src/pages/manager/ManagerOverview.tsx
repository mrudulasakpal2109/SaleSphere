import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RefreshCw,
  Clock,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  IndianRupee,
  Users,
  Package,
  BarChart2,
  CreditCard,
  PieChart,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatINR } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InsightsPanel } from "@/components/manager/InsightsPanel";
import type { Overview, LiveSalesOverview } from "@/managerTypes";

const PAYMENT_COLORS: Record<string, string> = {
  "UPI": "#0D9488",
  "Cash on Delivery": "#C85A32",
  "COD": "#C85A32",
  "Credit Card": "#1E293B",
  "Debit Card": "#2563EB",
  "PayPal": "#0284C7",
  "Net Banking": "#7C3AED",
  "Other": "#64748B",
};

export function Kpi({
  label,
  value,
  hint,
  testId,
  tone,
  icon: Icon
}: {
  label: string;
  value: string | number;
  hint?: string;
  testId: string;
  tone?: "sale" | "muted" | "live" | "success";
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div
      className="group relative border border-border/80 bg-card p-4.5 rounded-xs transition-all duration-150 hover:border-foreground/20 hover:shadow-xs"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className="text-muted-foreground/60 transition-colors group-hover:text-foreground">
            <Icon size={14} />
          </span>
        )}
      </div>
      <p
        className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${
          tone === "sale"
            ? "text-sale"
            : tone === "live" || tone === "success"
            ? "text-[#15803D]"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground line-clamp-1">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PageTitle({
  overline,
  title,
  children
}: {
  overline: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="overline-label">{overline}</p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

const shortDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

interface BaselineRecord {
  orders: number;
  revenue: number;
  timestamp: string;
}

export default function ManagerOverview() {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(false);
  const [paymentView, setPaymentView] = useState<"period" | "warehouse">("period");

  // Baselines keyed by period for before-and-after comparison
  const [baselines, setBaselines] = useState<Record<string, BaselineRecord>>({});

  const queryUrl = (() => {
    let url = `/manager/overview?period=${selectedPeriod}`;
    if (selectedPeriod === "custom" && customStart && customEnd) {
      url += `&start_date=${customStart}&end_date=${customEnd}`;
    }
    return url;
  })();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["manager", "overview", selectedPeriod, customStart, customEnd],
    queryFn: () => apiGet<Overview>(queryUrl),
    refetchOnWindowFocus: true
  });

  // Initialize or maintain baseline when data loads
  useEffect(() => {
    if (data?.live_sales) {
      const live = data.live_sales;
      setBaselines((prev) => {
        if (!prev[selectedPeriod]) {
          return {
            ...prev,
            [selectedPeriod]: {
              orders: live.metrics.orders_count,
              revenue: live.metrics.revenue,
              timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            }
          };
        }
        return prev;
      });
    }
  }, [data, selectedPeriod]);

  const handleCaptureBaseline = () => {
    if (data?.live_sales) {
      const nowStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setBaselines((prev) => ({
        ...prev,
        [selectedPeriod]: {
          orders: data.live_sales!.metrics.orders_count,
          revenue: data.live_sales!.metrics.revenue,
          timestamp: nowStr
        }
      }));
      toast.success(`Comparison baseline reset to ${data.live_sales.metrics.orders_count} orders at ${nowStr}`);
    }
  };

  const handleManualRefresh = async () => {
    await refetch();
    toast.success("Dashboard metrics refreshed successfully!");
  };

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const k = data.kpis;
  const live = data.live_sales;

  // Comparison metrics calculation
  const currentBaseline = baselines[selectedPeriod] || (live ? {
    orders: live.metrics.orders_count,
    revenue: live.metrics.revenue,
    timestamp: live.as_of ? live.as_of.slice(11, 19) : "Initial load"
  } : null);

  const prevOrders = currentBaseline ? currentBaseline.orders : (live ? live.metrics.orders_count : 0);
  const currOrders = live ? live.metrics.orders_count : 0;
  const diffOrders = currOrders - prevOrders;

  const prevRevenue = currentBaseline ? currentBaseline.revenue : (live ? live.metrics.revenue : 0);
  const currRevenue = live ? live.metrics.revenue : 0;
  const diffRevenue = Math.round((currRevenue - prevRevenue) * 100) / 100;

  const unsyncedDwCount = live?.warehouse_status?.unsynced_live_orders ?? 0;
  const lastDwSyncTime = live?.warehouse_status?.last_sync_timestamp;

  const periodOptions = [
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "all", label: "All Time" },
    { id: "custom", label: "Custom Range" }
  ];

  const periodPaymentData = (() => {
    if (!live?.transactions || live.transactions.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const tx of live.transactions) {
      const pm = tx.payment_method || "Other";
      counts[pm] = (counts[pm] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  })();

  const activePaymentData =
    paymentView === "period" && periodPaymentData.length > 0
      ? periodPaymentData
      : data.payment_status;

  const totalPaymentOrders = activePaymentData.reduce((acc, p) => acc + p.count, 0);

  const hasLiveChartData =
    live?.chart &&
    live.chart.length > 0 &&
    live.chart.some((p) => p.orders > 0 || p.revenue > 0);

  return (
    <div className="space-y-8" data-testid="manager-overview-page">
      {/* Page Title & Top Controls */}
      <PageTitle overline={`Operational OLTP & Analytical DW · As of ${data.as_of}`} title="Store & Live Sales Overview">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs bg-card"
            data-testid="refresh-dashboard-btn"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? "Refreshing..." : "Refresh Live Data"}
          </Button>

          <Link to="/manager/etl">
            <Button
              type="button"
              size="sm"
              className="flex items-center gap-1.5 text-xs bg-[#1A1A1A] text-white hover:bg-[#333333]"
              data-testid="goto-etl-btn"
            >
              <Database size={13} />
              <span>ETL Warehouse Sync</span>
              {unsyncedDwCount > 0 && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold bg-[#C85A32] text-white rounded-full">
                  {unsyncedDwCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </PageTitle>
      {/* ========================================================================= */}
      {/* FEATURE A: DEDICATED LIVE SALES & RECENT STOREFRONT ACTIVITY (OLTP)      */}
      {/* ========================================================================= */}
      <section
        className="border border-border/80 bg-gradient-to-b from-[#FDFBF7] to-card p-5 sm:p-6 space-y-6 rounded-sm shadow-xs"
        data-testid="manager-live-sales-section"
      >
        {/* Section Header & Live Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200 rounded-xs">
                <span className="h-2 w-2 rounded-full bg-[#15803D] animate-pulse" />
                LIVE STOREFRONT ACTIVITY (OLTP)
              </span>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                database/operational.db
              </span>
            </div>
            <h2 className="font-heading text-2xl font-medium tracking-tight text-foreground">
              Live Sales & Purchase Stream
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Directly queries live customer checkout in the operational database. Updates instantly on new purchases without waiting for warehouse ETL.
            </p>
          </div>

          {/* Date-Range Selector Bar (Feature C) */}
          <div className="flex flex-wrap items-center gap-1 bg-background border border-border/80 p-1 rounded-xs shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1">
              <Filter size={11} /> Range:
            </span>
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedPeriod(opt.id);
                  setShowCustomInputs(opt.id === "custom");
                }}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-all ${
                  selectedPeriod === opt.id
                    ? "bg-[#1A1A1A] text-white shadow-xs font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
                data-testid={`filter-${opt.id}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {showCustomInputs && (
          <div className="p-3.5 bg-card border border-border/80 rounded-xs flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-foreground">Custom Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-muted-foreground">Start:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-border bg-background px-2 py-1 text-xs font-mono rounded-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-muted-foreground">End:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-border bg-background px-2 py-1 text-xs font-mono rounded-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="text-xs h-7.5 px-3"
            >
              Apply Filter
            </Button>
          </div>
        )}

        {/* Live Metrics Cards for Selected Period */}
        {live && (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <Kpi
              testId="kpi-live-orders"
              label={`Orders (${live.period_label.split(" ")[0]})`}
              value={live.metrics.orders_count}
              hint={`${live.metrics.total_orders_placed} placed · ${live.metrics.cancelled_orders} cancelled`}
              tone="live"
              icon={ShoppingBag}
            />
            <Kpi
              testId="kpi-live-revenue"
              label="Realized Revenue"
              value={formatINR(live.metrics.revenue)}
              hint="Excludes cancellations & refunds"
              tone="sale"
              icon={TrendingUp}
            />
            <Kpi
              testId="kpi-live-aov"
              label="Period Avg Order Value"
              value={formatINR(live.metrics.avg_order_value)}
              hint="Over non-cancelled orders"
              icon={IndianRupee}
            />
            <Kpi
              testId="kpi-live-items"
              label="Units Purchased"
              value={`${live.metrics.items_sold} units`}
              hint={
                unsyncedDwCount > 0
                  ? `⚠️ ${unsyncedDwCount} order(s) pending ETL sync`
                  : "✓ All live orders ingested into DW"
              }
              icon={Package}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* FEATURE B: BEFORE-AND-AFTER KPI COMPARISON AREA                           */}
        {/* ========================================================================= */}
        <div
          className="border border-border/80 bg-card p-5 space-y-4 rounded-sm shadow-xs"
          data-testid="manager-before-after-kpi"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sale/10 text-sale">
                  <Sparkles size={12} />
                </span>
                <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-foreground">
                  Live Purchase Impact · Before vs After Comparison
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Captures pre-purchase baseline to visibly prove the impact of new customer checkouts during project presentation.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCaptureBaseline}
              className="text-xs font-medium flex items-center gap-1.5 h-8 bg-background hover:bg-muted"
              data-testid="capture-baseline-btn"
            >
              <Clock size={12} className="text-muted-foreground" />
              <span>Capture Current as Baseline</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Box 1: Orders Comparison */}
            <div className="bg-background/80 border border-border/70 p-3.5 rounded-xs space-y-1.5 hover:border-border transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Orders Delta
                </span>
                <ShoppingBag size={12} className="text-muted-foreground/60" />
              </div>
              <div className="flex items-center gap-2 font-mono text-base font-semibold">
                <span className="text-muted-foreground/80">{prevOrders}</span>
                <ArrowRight size={13} className="text-muted-foreground/50 shrink-0" />
                <span className="text-foreground text-lg">{currOrders}</span>
              </div>
              <div className="text-xs font-medium pt-0.5">
                {diffOrders > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-emerald-50 text-[#15803D] font-mono text-[11px] font-semibold border border-emerald-200/60">
                    <CheckCircle2 size={11} /> +{diffOrders} order{diffOrders > 1 ? "s" : ""}
                  </span>
                ) : diffOrders < 0 ? (
                  <span className="text-destructive font-mono">{diffOrders} orders</span>
                ) : (
                  <span className="text-muted-foreground text-[11px] font-mono">0 orders delta</span>
                )}
              </div>
            </div>

            {/* Box 2: Revenue Comparison */}
            <div className="bg-background/80 border border-border/70 p-3.5 rounded-xs space-y-1.5 hover:border-border transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Realized Revenue Delta
                </span>
                <TrendingUp size={12} className="text-muted-foreground/60" />
              </div>
              <div className="flex items-center gap-2 font-mono text-xs font-semibold truncate">
                <span className="text-muted-foreground/80">{formatINR(prevRevenue)}</span>
                <ArrowRight size={12} className="text-muted-foreground/50 shrink-0" />
                <span className="text-foreground font-bold">{formatINR(currRevenue)}</span>
              </div>
              <div className="text-xs font-medium pt-0.5">
                {diffRevenue > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-emerald-50 text-[#15803D] font-mono text-[11px] font-semibold border border-emerald-200/60">
                    +{formatINR(diffRevenue)} net increase
                  </span>
                ) : diffRevenue < 0 ? (
                  <span className="text-destructive font-mono">-{formatINR(Math.abs(diffRevenue))}</span>
                ) : (
                  <span className="text-muted-foreground text-[11px] font-mono">₹0.00 delta</span>
                )}
              </div>
            </div>

            {/* Box 3: Baseline Reference Point */}
            <div className="bg-background/80 border border-border/70 p-3.5 rounded-xs space-y-1.5 hover:border-border transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Baseline Reference
                </span>
                <Clock size={12} className="text-muted-foreground/60" />
              </div>
              <p className="font-mono text-xs font-semibold text-foreground">
                {currentBaseline ? `Captured at ${currentBaseline.timestamp}` : "Initial load"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Scope: <span className="font-medium text-foreground">{live?.period_label || selectedPeriod}</span>
              </p>
            </div>

            {/* Box 4: Warehouse (OLAP) Boundary */}
            <div className="bg-background/80 border border-border/70 p-3.5 rounded-xs space-y-1.5 hover:border-border transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Warehouse Ingestion
                </span>
                <Database size={12} className="text-muted-foreground/60" />
              </div>
              <p className="font-mono text-xs font-semibold text-foreground">
                {unsyncedDwCount > 0 ? (
                  <span className="text-[#C85A32] font-semibold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32] animate-ping" />
                    {unsyncedDwCount} order(s) pending ETL
                  </span>
                ) : (
                  <span className="text-[#15803D] inline-flex items-center gap-1">
                    <CheckCircle2 size={11} /> Up to date in DW
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground truncate" title={lastDwSyncTime || "Initial seed"}>
                Last Sync: <span className="font-mono text-[10px]">{lastDwSyncTime || "Initial seed"}</span>
              </p>
            </div>
          </div>

          {/* Interactive Status Callout */}
          {diffOrders > 0 ? (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-950 rounded-xs flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-[#15803D] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-emerald-900">Live Purchase Impact Verified:</span> Recorded{" "}
                <b className="font-mono">+{diffOrders} distinct order(s)</b> and{" "}
                <b className="font-mono">+{formatINR(diffRevenue)}</b> in realized revenue since baseline ({currentBaseline?.timestamp}).
                Operational database updated instantly. Run ETL to propagate into analytical Star Schema.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/40 border border-border/70 text-xs text-muted-foreground rounded-xs flex items-start gap-2.5">
              <AlertCircle size={15} className="shrink-0 text-muted-foreground/80 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-foreground">Baseline Active:</span> Currently displaying{" "}
                <b className="font-mono text-foreground">{currOrders} orders ({formatINR(currRevenue)})</b> recorded for{" "}
                {live?.period_label}. Place a customer test order in the storefront, then click <b>Refresh Live Data</b> above to demonstrate instant purchase impact.
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION: TWO-COLUMN VISUAL ANALYTICS SUITE (MATCHING RFM & SEGMENTS STYLE) */}
        {/* ========================================================================= */}
        <div className="space-y-6 pt-2" data-testid="manager-visual-analytics-suite">
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-sale" />
                <h3 className="font-heading text-xl font-medium text-foreground">
                  Sales & Transaction Analytics Suite
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visualizing revenue trajectory, order velocity, category demand, and payment settlement distribution for {live?.period_label}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary text-foreground font-medium rounded-xs border border-border/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[#15803D] animate-pulse" />
                Live Period: <b className="font-mono">{live?.period_label}</b>
              </span>
            </div>
          </div>

          {/* TWO-COLUMN GRID: ROW 1 (Revenue Trend & Orders Trend) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. SALES REVENUE TREND (Line / Area Chart) */}
            <div
              className="border border-border/80 bg-card p-5 space-y-3 rounded-sm shadow-xs"
              data-testid="manager-revenue-trend-chart"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-sale" />
                    <h4 className="font-heading text-base font-semibold text-foreground">
                      Sales Revenue Trend
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Realized sales cashflow across {live?.period_label}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-secondary text-foreground uppercase tracking-wider rounded-xs border border-border/60">
                  Live Stream ({live?.chart_interval})
                </span>
              </div>

              {hasLiveChartData ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={live.chart} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                      <defs>
                        <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#EAE5DE" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} minTickGap={16} tickLine={false} axisLine={{ stroke: "#E0D9CF" }} />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#FAF8F5] border border-[#E5E0D8] p-2.5 shadow-md rounded-xs text-xs font-sans">
                                <p className="font-heading font-semibold text-[#1A1A1A] pb-1 border-b border-[#EAE5DE] mb-1">
                                  {label}
                                </p>
                                <p className="font-mono text-xs font-bold text-foreground">
                                  Revenue: {formatINR(Number(payload[0].value))}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Realized Revenue"
                        stroke="#1A1A1A"
                        strokeWidth={2.5}
                        fill="url(#revenueAreaGrad)"
                        dot={{ r: 3, fill: "#1A1A1A" }}
                        activeDot={{ r: 5, fill: "#C85A32" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-14 text-center space-y-2 border border-dashed border-border bg-background/50 rounded-xs">
                  <Calendar size={24} className="mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-medium text-foreground">No revenue recorded for {live?.period_label}</p>
                </div>
              )}
            </div>

            {/* 2. ORDERS TREND (Bar Chart) */}
            <div
              className="border border-border/80 bg-card p-5 space-y-3 rounded-sm shadow-xs"
              data-testid="manager-orders-trend-chart"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={16} className="text-sale" />
                    <h4 className="font-heading text-base font-semibold text-foreground">
                      Orders Volume Trend
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Distinct completed purchase counts over time
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-secondary text-foreground uppercase tracking-wider rounded-xs border border-border/60">
                  Total: {live?.metrics.orders_count} orders
                </span>
              </div>

              {hasLiveChartData ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={live.chart} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#EAE5DE" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} minTickGap={16} tickLine={false} axisLine={{ stroke: "#E0D9CF" }} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#FAF8F5] border border-[#E5E0D8] p-2.5 shadow-md rounded-xs text-xs font-sans">
                                <p className="font-heading font-semibold text-[#1A1A1A] pb-1 border-b border-[#EAE5DE] mb-1">
                                  {label}
                                </p>
                                <p className="font-mono text-xs font-bold text-foreground">
                                  Volume: {payload[0].value} order{Number(payload[0].value) === 1 ? "" : "s"}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="orders" name="Orders" fill="#C85A32" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-14 text-center space-y-2 border border-dashed border-border bg-background/50 rounded-xs">
                  <Calendar size={24} className="mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-medium text-foreground">No order counts recorded for {live?.period_label}</p>
                </div>
              )}
            </div>
          </div>

          {/* TWO-COLUMN GRID: ROW 2 (Revenue vs Orders & Sales by Category) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. REVENUE VS ORDERS CORRELATION (Dual-Axis Composed Chart) */}
            <div
              className="border border-border/80 bg-card p-5 space-y-3 rounded-sm shadow-xs"
              data-testid="manager-live-sales-chart"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-sale" />
                    <h4 className="font-heading text-base font-semibold text-foreground">
                      Revenue vs. Orders Velocity
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dual-axis view correlating gross turnover against transaction volume
                  </p>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-mono">
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#1A1A1A]" /> Revenue (₹)
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#C85A32]" /> Orders
                  </span>
                </div>
              </div>

              {hasLiveChartData ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={live.chart} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#EAE5DE" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} minTickGap={16} tickLine={false} axisLine={{ stroke: "#E0D9CF" }} />
                      <YAxis
                        yAxisId="rev"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <YAxis
                        yAxisId="ord"
                        orientation="right"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#FAF8F5] border border-[#E5E0D8] p-2.5 shadow-md rounded-xs text-xs font-sans">
                                <p className="font-heading font-semibold text-[#1A1A1A] pb-1 border-b border-[#EAE5DE] mb-1">
                                  {label}
                                </p>
                                <div className="space-y-0.5 font-mono text-[11px]">
                                  {payload.map((entry, idx) => (
                                    <div key={`comp-${idx}`} className="flex items-center justify-between gap-3">
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                                        {entry.name}:
                                      </span>
                                      <span className="font-bold text-foreground">
                                        {entry.dataKey === "revenue" ? formatINR(Number(entry.value)) : `${entry.value} orders`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="#1A1A1A" radius={[3, 3, 0, 0]} />
                      <Line
                        yAxisId="ord"
                        type="monotone"
                        dataKey="orders"
                        name="Orders"
                        stroke="#C85A32"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#C85A32" }}
                        activeDot={{ r: 5, fill: "#C85A32" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-14 text-center space-y-2 border border-dashed border-border bg-background/50 rounded-xs">
                  <Calendar size={24} className="mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-medium text-foreground">No dual-axis data recorded for {live?.period_label}</p>
                </div>
              )}
            </div>

            {/* 4. SALES BY PRODUCT CATEGORY (Bar Chart) */}
            <div
              className="border border-border/80 bg-card p-5 space-y-3 rounded-sm shadow-xs"
              data-testid="manager-category-chart"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-sale" />
                    <h4 className="font-heading text-base font-semibold text-foreground">
                      Sales by Product Category
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Turnover and volume demand across apparel departments
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-secondary text-foreground uppercase tracking-wider rounded-xs border border-border/60">
                  Data Warehouse Star Schema
                </span>
              </div>

              {data.category_sales && data.category_sales.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.category_sales} margin={{ left: 0, right: 12, top: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#EAE5DE" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="category" fontSize={11} tickLine={false} axisLine={{ stroke: "#E0D9CF" }} />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `₹${v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const catItem = data.category_sales.find((c) => c.category === label);
                            return (
                              <div className="bg-[#FAF8F5] border border-[#E5E0D8] p-2.5 shadow-md rounded-xs text-xs font-sans">
                                <p className="font-heading font-semibold text-[#1A1A1A] pb-1 border-b border-[#EAE5DE] mb-1">
                                  {label} Department
                                </p>
                                <p className="font-mono text-[11px] text-foreground">
                                  Realized Revenue: <b>{formatINR(catItem?.order_value || 0)}</b>
                                </p>
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  Units Sold: <b>{(catItem?.units || 0).toLocaleString()} units</b>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Bar dataKey="order_value" name="Order Value (₹)" fill="#1A1A1A" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-14 text-center space-y-2 border border-dashed border-border bg-background/50 rounded-xs">
                  <p className="text-xs text-muted-foreground">No category data available.</p>
                </div>
              )}
            </div>
          </div>

          {/* ROW 3: PAYMENT METHOD DISTRIBUTION (Full Width with Cards & Chart) */}
          <div
            className="border border-border/80 bg-card p-5 space-y-4 rounded-sm shadow-xs"
            data-testid="manager-payment-methods-chart"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-sale" />
                  <h4 className="font-heading text-base font-semibold text-foreground">
                    Payment Method Distribution
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order distribution by settlement instrument — comparing live operational checkout with star schema warehouse records
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-background border border-border/80 p-0.5 rounded-xs">
                <button
                  type="button"
                  onClick={() => setPaymentView("period")}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition ${
                    paymentView === "period"
                      ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Selected Period ({periodPaymentData.length > 0 ? `${periodPaymentData.reduce((a, b) => a + b.count, 0)} orders` : "0 orders"})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentView("warehouse")}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition ${
                    paymentView === "warehouse"
                      ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Warehouse All-Time ({data.payment_status.reduce((a, b) => a + b.count, 0).toLocaleString()} orders)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Horizontal Bar Chart (Left 7 Cols) */}
              <div className="lg:col-span-7 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activePaymentData}
                    layout="vertical"
                    margin={{ left: 24, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#EAE5DE" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} tickLine={false} axisLine={{ stroke: "#E0D9CF" }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const count = Number(payload[0].value);
                          const pct = totalPaymentOrders > 0 ? ((count / totalPaymentOrders) * 100).toFixed(1) : "0";
                          return (
                            <div className="bg-[#FAF8F5] border border-[#E5E0D8] p-2.5 shadow-md rounded-xs text-xs font-sans">
                              <p className="font-heading font-semibold text-[#1A1A1A] pb-0.5 border-b border-[#EAE5DE] mb-1">
                                {label}
                              </p>
                              <p className="font-mono text-xs font-bold text-foreground">
                                {count.toLocaleString()} orders ({pct}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" name="Orders" radius={[0, 3, 3, 0]}>
                      {activePaymentData.map((entry, index) => (
                        <Cell key={`cell-pm-${index}`} fill={PAYMENT_COLORS[entry.label] || "#475569"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Breakdown Cards (Right 5 Cols) */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-2 text-xs">
                {activePaymentData.map((pm) => {
                  const pct = totalPaymentOrders > 0 ? ((pm.count / totalPaymentOrders) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={pm.label}
                      className="border border-border/70 bg-background/80 p-2.5 rounded-xs space-y-1 hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground truncate" title={pm.label}>
                          {pm.label}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PAYMENT_COLORS[pm.label] || "#475569" }}
                        />
                      </div>
                      <div className="flex items-baseline justify-between font-mono">
                        <span className="text-sm font-bold text-foreground">
                          {pm.count.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RECENT TRANSACTIONS TABLE (IN SELECTED RANGE)                             */}
        {/* ========================================================================= */}
        <div className="border border-border bg-card p-5 space-y-3" data-testid="manager-live-transactions-table">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-lg font-medium text-foreground">
                Operational Purchases ({live?.transactions?.length ?? 0} orders in {live?.period_label})
              </h3>
              <p className="text-xs text-muted-foreground">
                Showing live customer transactions recorded in SQLite operational store with line item counts and warehouse ETL sync indicators.
              </p>
            </div>
          </div>

          {live?.transactions && live.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-foreground text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5">Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Placed Time</th>
                    <th>Status</th>
                    <th>Warehouse ETL</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {live.transactions.map((o) => (
                    <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-mono text-xs font-semibold">{o.id}</td>
                      <td>
                        <span className="font-medium">{o.customer_name}</span>
                        {o.is_guest && <span className="ml-1 text-[11px] text-muted-foreground">(guest)</span>}
                      </td>
                      <td className="text-xs text-muted-foreground max-w-[200px] truncate" title={o.items_summary}>
                        {o.items_summary}
                      </td>
                      <td className="text-xs text-muted-foreground font-mono">{o.placed_at}</td>
                      <td className="text-xs">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded-xs font-medium ${
                            o.status === "Cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {o.status} · {o.payment_status}
                        </span>
                      </td>
                      <td className="text-xs">
                        {o.synced_to_dw ? (
                          <span className="inline-flex items-center gap-1 text-[#15803D] font-medium text-[11px]">
                            <CheckCircle2 size={12} /> Synced to DW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#C85A32] font-medium text-[11px]">
                            <Clock size={12} /> Pending ETL
                          </span>
                        )}
                      </td>
                      <td className="text-right font-mono font-medium">{formatINR(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No transactions found within this date range.
            </p>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* HISTORICAL DATA WAREHOUSE & ANALYTICS SECTION (OLAP STAR SCHEMA)           */}
      {/* ========================================================================= */}
      <section className="space-y-6 pt-4 border-t-2 border-border" data-testid="manager-warehouse-analytics-section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-muted text-foreground border border-border rounded-sm">
                <Layers size={13} />
                ANALYTICAL DATA WAREHOUSE (OLAP)
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                database/ecommerce_dw.db · 45,000+ Unified Star Schema Records
              </span>
            </div>
            <h2 className="font-heading text-2xl font-medium tracking-tight text-foreground">
              All-Time Warehouse Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Calculated across all historical transaction dimensions and incrementally synced live orders.
            </p>
          </div>
        </div>

        {/* 8 All-Time Warehouse KPIs */}
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <Kpi
            testId="kpi-paid-revenue"
            label="Paid revenue"
            value={formatINR(k.paid_revenue)}
            hint="Collected payments only"
            tone="sale"
            icon={TrendingUp}
          />
          <Kpi
            testId="kpi-completed-sales"
            label="Completed sales"
            value={k.completed_sales}
            hint="Paid & not cancelled"
            icon={CheckCircle2}
          />
          <Kpi
            testId="kpi-total-orders"
            label="Total orders"
            value={k.total_orders}
            hint={`${k.open_orders} open · ${k.cancelled_orders} cancelled`}
            icon={BarChart2}
          />
          <Kpi
            testId="kpi-pending-cod"
            label="Pending COD value"
            value={formatINR(k.pending_cod_value)}
            hint="Not revenue until collected"
            icon={Clock}
          />
          <Kpi
            testId="kpi-customers"
            label="Registered customers"
            value={k.registered_customers}
            icon={Users}
          />
          <Kpi
            testId="kpi-aov"
            label="Avg order value"
            value={formatINR(k.avg_order_value)}
            hint="Non-cancelled orders"
            icon={IndianRupee}
          />
          <Kpi
            testId="kpi-stock"
            label="Units in stock"
            value={k.units_in_stock}
            hint={`${k.active_products} active products`}
            icon={Package}
          />
          <Kpi
            testId="kpi-low-stock"
            label="Low / out of stock"
            value={`${k.low_stock_products} / ${k.out_of_stock_products}`}
            hint="≤ 5 units counts as low"
            icon={AlertCircle}
          />
        </div>

        <InsightsPanel />

        {/* All-Time 30-Day Trend Chart */}
        <section className="border border-border bg-card p-5" data-testid="manager-trend-chart">
          <h2 className="font-heading text-xl font-medium">Orders & revenue — last 30 days</h2>
          <p className="text-xs text-muted-foreground">
            Order value includes unpaid COD orders; paid revenue counts only collected payments from the warehouse fact table.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="#E8E2D9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={shortDate} fontSize={11} minTickGap={24} />
                <YAxis yAxisId="v" fontSize={11} tickFormatter={(v: number) => `₹${v}`} />
                <YAxis yAxisId="o" orientation="right" fontSize={11} allowDecimals={false} />
                <Tooltip
                  formatter={(v, n) => (n === "Orders" ? v : formatINR(Number(v)))}
                  labelFormatter={(l) => shortDate(String(l))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="v"
                  type="monotone"
                  dataKey="order_value"
                  name="Order value"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="v"
                  type="monotone"
                  dataKey="paid_revenue"
                  name="Paid revenue"
                  stroke="#C85A32"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="o"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#B8860B"
                  strokeDasharray="4 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Warehouse Fulfillment & Product Performance */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="border border-border bg-card p-5 space-y-3" data-testid="manager-fulfillment-health">
            <h2 className="font-heading text-xl font-medium">Order Fulfillment & Settlement Health</h2>
            <p className="text-xs text-muted-foreground">
              Lifecycle status breakdown across historical warehouse transactions.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Order Status Pipeline
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.order_status.map((s) => (
                    <div key={`ord-${s.label}`} className="border border-border/80 bg-background/80 p-2.5 rounded-xs">
                      <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                      <p className="font-mono text-base font-bold text-foreground mt-0.5">{s.count.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Payment Settlement Status
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.payment_status.slice(0, 6).map((s) => (
                    <div key={`pay-${s.label}`} className="border border-border/80 bg-background/80 p-2.5 rounded-xs">
                      <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                      <p className="font-mono text-base font-bold text-foreground mt-0.5">{s.count.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="border border-border bg-card p-5" data-testid="manager-top-products">
            <h2 className="font-heading text-xl font-medium">Product performance</h2>
            <p className="text-xs text-muted-foreground">Units in non-cancelled orders.</p>
            {data.top_products.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Units</th>
                    <th className="py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.map((p) => (
                    <tr key={p.product_id} className="border-b border-border">
                      <td className="py-2">
                        <span className="font-medium">{p.name}</span>{" "}
                        <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                      </td>
                      <td className="py-2 text-right font-mono">{p.units}</td>
                      <td className="py-2 text-right font-mono">{formatINR(p.order_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Link
              to="/manager/inventory?stock=low"
              className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4 hover:text-sale"
              data-testid="manager-low-stock-link"
            >
              View low-stock products →
            </Link>
          </section>
        </div>

        {/* Historical Recent Orders */}
        <section className="border border-border bg-card p-5" data-testid="manager-recent-orders">
          <h2 className="font-heading text-xl font-medium">Recent orders (Warehouse & Live Archive)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-foreground text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="border-b border-border">
                    <td className="py-2 font-mono">{o.id}</td>
                    <td>
                      {o.customer_name}
                      {o.is_guest && <span className="ml-1 text-xs text-muted-foreground">(guest)</span>}
                    </td>
                    <td className="text-muted-foreground">{formatDateTime(o.placed_at)}</td>
                    <td>
                      {o.status} · {o.payment_status}
                    </td>
                    <td className="text-right font-mono">{formatINR(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
