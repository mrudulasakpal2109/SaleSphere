import { useState } from "react";
import {
  GitFork,
  ChevronDown,
  ChevronRight,
  Tag,
  SlidersHorizontal,
  Compass,
  Sparkles
} from "lucide-react";
import { formatINR } from "@/lib/format";
import type { TreeNode, DemandPredictionResult } from "@/managerTypes";

interface DecisionTreeExplainerProps {
  treeGraph: TreeNode;
  predictionResult: DemandPredictionResult | null;
  currentProduct: {
    name: string;
    category: string;
    subcategory: string;
    brand: string;
    price: number;
    discount_percentage: number;
    launch_month: number;
    color: string;
    fabric: string;
  };
  onSwitchToSimulator?: () => void;
  onApplyPreset?: (preset: any) => void;
  samplePresets?: any[];
}

export function DecisionTreeExplainer({
  treeGraph,
  predictionResult,
  currentProduct,
  onSwitchToSimulator,
  onApplyPreset,
  samplePresets = [],
}: DecisionTreeExplainerProps) {
  const [viewMode, setViewMode] = useState<"flow" | "tree">("flow");
  const [highlightOnlyActive, setHighlightOnlyActive] = useState<boolean>(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});

  // Active path node IDs from current prediction
  const activePathRules = predictionResult?.decision_path ?? [];
  const activeNodeIds = new Set<number>(activePathRules.map((r) => r.node_id));

  // Determine which leaf was reached
  const predictedTier = predictionResult?.demand_tier;
  const predictedUnits = predictionResult?.predicted_units;

  const toggleNode = (nodeId: number) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  return (
    <div className="space-y-6" data-testid="decision-tree-explainer-section">
      {/* Teacher / Examiner Context Banner */}
      <div className="border border-border/80 bg-gradient-to-r from-[#FAF8F5] via-card to-[#FAF8F5] p-5 rounded-sm shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-sale/10 text-sale border border-sale/20 rounded-xs">
                <Compass size={12} />
                EXPLAINABLE AI & MACHINE LEARNING
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                CART Algorithm (Scikit-Learn) · Max Depth = 4
              </span>
            </div>
            <h2 className="font-heading text-2xl font-medium tracking-tight text-foreground">
              How the Decision Tree Decides
            </h2>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              This interactive diagram explains the exact sequence of feature-based decision boundaries learned by the
              model from 45,000+ historical transactions. Pre-launch product attributes flow through binary split
              conditions along <b>Yes (Left)</b> or <b>No (Right)</b> branches down to a terminal leaf node declaring
              predicted demand velocity.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-xs">
            <button
              type="button"
              onClick={() => setViewMode("flow")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all flex items-center gap-1.5 ${
                viewMode === "flow"
                  ? "bg-[#1A1A1A] text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Step-by-Step Decision Journey</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all flex items-center gap-1.5 ${
                viewMode === "tree"
                  ? "bg-[#1A1A1A] text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitFork size={13} />
              <span>Full Decision Tree Graph</span>
            </button>
          </div>
        </div>

        {/* Small Legend mandated by user requirements */}
        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Diagram Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-xs border border-border bg-card shadow-xs" />
            <span className="font-medium text-foreground">
              <b>Decision Node:</b> A feature condition being tested (e.g. Price, Month, Discount)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold">
              <span className="text-emerald-700 bg-emerald-100 px-1 rounded-xs">Left = Yes</span> /{" "}
              <span className="text-rose-700 bg-rose-100 px-1 rounded-xs">Right = No</span>
            </span>
            <span className="font-medium text-foreground">
              <b>Branch:</b> The result of that condition
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-600" />
            <span className="font-medium text-foreground">
              <b>Leaf Node:</b> The model's final prediction (High, Medium, or Low Demand)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-xs bg-[#C85A32] ring-2 ring-[#C85A32]/30" />
            <span className="font-medium text-[#C85A32]">
              <b>Active Path:</b> Traversed sequence for the currently simulated product
            </span>
          </div>
        </div>
      </div>

      {/* Current Product Context Bar */}
      <div className="border border-border bg-card p-4 rounded-sm flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Currently Evaluating:
            </span>
            <span className="font-heading font-semibold text-foreground text-sm">
              {currentProduct.name}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              ({currentProduct.category} · {currentProduct.subcategory} · {currentProduct.brand})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Price: <b className="font-mono text-foreground">{formatINR(currentProduct.price)}</b></span>
            <span>Discount: <b className="font-mono text-foreground">{currentProduct.discount_percentage}%</b></span>
            <span>Launch Month: <b className="font-mono text-foreground">Month {currentProduct.launch_month}</b></span>
            <span>Color: <b className="text-foreground">{currentProduct.color}</b></span>
            <span>Fabric: <b className="text-foreground">{currentProduct.fabric}</b></span>
          </div>
        </div>

        {predictionResult ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Model Prediction Result
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase rounded-xs ${
                  predictionResult.demand_tier === "High"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : predictionResult.demand_tier === "Medium"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {predictionResult.demand_tier} Demand ({predictionResult.predicted_units} units)
              </span>
            </div>
            <span className="text-xs font-mono bg-sale/10 text-sale px-2 py-1 rounded-xs border border-sale/20">
              {activePathRules.length} decision steps traversed
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {samplePresets.length > 0 && onApplyPreset && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">Quick Presets:</span>
                {samplePresets.slice(0, 3).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => onApplyPreset(p)}
                    className="text-[11px] border border-border px-2 py-0.5 rounded-xs hover:bg-muted"
                  >
                    {p.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            )}
            {onSwitchToSimulator && (
              <button
                type="button"
                onClick={onSwitchToSimulator}
                className="text-xs bg-[#1A1A1A] text-white px-3 py-1.5 rounded-xs hover:bg-[#333333]"
              >
                Run Prediction in Simulator ➔
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: STEP-BY-STEP DECISION JOURNEY                                */}
      {/* ========================================================================= */}
      {viewMode === "flow" && (
        <div className="space-y-4" data-testid="decision-journey-flow">
          <div className="border border-border bg-card p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="font-heading text-lg font-medium text-foreground">
                  Decision Path for "{currentProduct.name}"
                </h3>
                <p className="text-xs text-muted-foreground">
                  Traces the exact conditional branches taken by this product through the trained Decision Tree.
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Path Length: <b className="text-foreground">{activePathRules.length} Decision Nodes + 1 Terminal Leaf</b>
              </span>
            </div>

            {activePathRules.length === 0 ? (
              <div className="py-12 text-center space-y-3 border border-dashed border-border bg-background/50 rounded-xs">
                <Compass size={28} className="mx-auto text-muted-foreground/60" />
                <p className="text-sm font-medium text-foreground">No active simulation path recorded yet</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Click the button below to run a simulation for "{currentProduct.name}" and view its step-by-step
                  decision journey through the tree.
                </p>
                {onSwitchToSimulator && (
                  <button
                    type="button"
                    onClick={onSwitchToSimulator}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#1A1A1A] text-white rounded-xs hover:bg-[#333333]"
                  >
                    <Sparkles size={13} />
                    <span>Run Demand Prediction in Simulator</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Initial Input Box */}
                <div className="border-2 border-border/80 bg-background p-4 rounded-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Tag size={12} /> STEP 0: PRODUCT DESIGN ATTRIBUTES
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">Known Pre-Launch Features</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-card p-2 border border-border/60 rounded-xs">
                      <span className="text-[10px] text-muted-foreground block">Selling Price</span>
                      <span className="font-bold text-foreground">{formatINR(currentProduct.price)}</span>
                    </div>
                    <div className="bg-card p-2 border border-border/60 rounded-xs">
                      <span className="text-[10px] text-muted-foreground block">Launch Month</span>
                      <span className="font-bold text-foreground">Month {currentProduct.launch_month}</span>
                    </div>
                    <div className="bg-card p-2 border border-border/60 rounded-xs">
                      <span className="text-[10px] text-muted-foreground block">Category / Type</span>
                      <span className="font-bold text-foreground">{currentProduct.category} · {currentProduct.subcategory}</span>
                    </div>
                    <div className="bg-card p-2 border border-border/60 rounded-xs">
                      <span className="text-[10px] text-muted-foreground block">Planned Discount</span>
                      <span className="font-bold text-foreground">{currentProduct.discount_percentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Arrow connector */}
                <div className="flex justify-center -my-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-border text-foreground text-xs shadow-xs">
                    ↓
                  </span>
                </div>

                {/* 2. Step-by-Step Decision Nodes */}
                {activePathRules.map((rule, idx) => {
                  const isLeft = rule.branch_taken.toLowerCase().includes("left");
                  return (
                    <div key={`rule-${rule.node_id}-${idx}`} className="space-y-2">
                      <div
                        className={`border-2 p-4 rounded-xs transition-all ${
                          isLeft
                            ? "border-emerald-500/80 bg-emerald-50/20"
                            : "border-rose-500/80 bg-rose-50/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span className="font-heading font-semibold text-sm text-foreground">
                              Decision Node #{rule.node_id}: Evaluating Feature <code className="text-sale">{rule.feature}</code>
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs ${
                              isLeft ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            Outcome: {isLeft ? "Condition Met (Passed Left / Yes)" : "Condition Not Met (Branched Right / No)"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                          <div className="bg-card p-2.5 border border-border/60 rounded-xs">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                              Split Rule / Threshold
                            </span>
                            <span className="font-semibold text-foreground text-sm">
                              {rule.feature} &lt;= {rule.threshold}
                            </span>
                          </div>
                          <div className="bg-card p-2.5 border border-border/60 rounded-xs">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                              Product Actual Value
                            </span>
                            <span className="font-bold text-foreground text-sm">
                              {rule.actual_value}
                            </span>
                          </div>
                          <div className="bg-card p-2.5 border border-border/60 rounded-xs">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                              Branch Decision
                            </span>
                            <span
                              className={`font-bold text-sm ${
                                isLeft ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {rule.branch_taken}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2.5 text-xs text-muted-foreground italic leading-relaxed">
                          Explanation: {rule.explanation}
                        </p>
                      </div>

                      {/* Arrow connector */}
                      <div className="flex justify-center -my-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-border text-foreground text-xs shadow-xs">
                          ↓
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Final Terminal Leaf Node */}
                <div
                  className={`border-2 p-5 rounded-xs ${
                    predictedTier === "High"
                      ? "border-emerald-600 bg-emerald-50/40 text-emerald-950"
                      : predictedTier === "Medium"
                      ? "border-amber-600 bg-amber-50/40 text-amber-950"
                      : "border-rose-600 bg-rose-50/40 text-rose-950"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold">
                        ★
                      </span>
                      <h4 className="font-heading font-bold text-base">
                        Terminal Leaf Node Reached ➔ Final Prediction
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase rounded-xs ${
                        predictedTier === "High"
                          ? "bg-emerald-700 text-white"
                          : predictedTier === "Medium"
                          ? "bg-amber-700 text-white"
                          : "bg-rose-700 text-white"
                      }`}
                    >
                      {predictedTier} Demand Velocity
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="bg-background/80 p-3 rounded-xs border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Estimated 30-Day Demand
                      </span>
                      <span className="text-xl font-bold text-foreground">
                        {predictedUnits} units
                      </span>
                    </div>
                    <div className="bg-background/80 p-3 rounded-xs border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Suggested Production Batch
                      </span>
                      <span className="text-xl font-bold text-sale">
                        {predictionResult?.suggested_initial_stock} units
                      </span>
                    </div>
                    <div className="bg-background/80 p-3 rounded-xs border border-border/60">
                      <span className="text-[10px] text-muted-foreground uppercase block">
                        Inventory Variance Status
                      </span>
                      <span className="text-sm font-bold text-foreground capitalize">
                        {predictionResult?.inventory_gap?.risk_type?.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed">
                    <b>Actionable Merchandising Guidance:</b> {predictionResult?.recommendation?.advice}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: COMPLETE HIERARCHICAL TREE GRAPH                             */}
      {/* ========================================================================= */}
      {viewMode === "tree" && (
        <div className="border border-border bg-card p-5 rounded-sm space-y-4" data-testid="hierarchical-tree-view">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div>
              <h3 className="font-heading text-lg font-medium text-foreground">
                Complete Trained Decision Tree Topology
              </h3>
              <p className="text-xs text-muted-foreground">
                Explore all mathematical split branches. Nodes on the active evaluation path for "{currentProduct.name}" are highlighted in terracotta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={highlightOnlyActive}
                  onChange={(e) => setHighlightOnlyActive(e.target.checked)}
                  className="rounded-xs border-border"
                />
                <span>Highlight active path only</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-background border border-border/70 rounded-xs max-h-[700px] overflow-auto">
            <ExplainerTreeNode
              node={treeGraph}
              activeNodeIds={activeNodeIds}
              dimNonActive={highlightOnlyActive}
              expandedNodes={expandedNodes}
              onToggleNode={toggleNode}
              depth={0}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Explainer Tree Node (Recursive with Active Path Highlighting)
function ExplainerTreeNode({
  node,
  activeNodeIds,
  dimNonActive,
  expandedNodes,
  onToggleNode,
  depth = 0,
}: {
  node: TreeNode;
  activeNodeIds: Set<number>;
  dimNonActive: boolean;
  expandedNodes: Record<number, boolean>;
  onToggleNode: (id: number) => void;
  depth?: number;
}) {
  const isLeaf = node.is_leaf;
  const isActivePath = activeNodeIds.has(node.id);
  const isCollapsed = expandedNodes[node.id] === true;

  const opacityClass = dimNonActive && !isActivePath ? "opacity-30" : "opacity-100";

  return (
    <div className={`my-2 font-mono text-xs transition-opacity ${opacityClass}`}>
      <div
        className={`inline-flex items-center gap-2.5 border px-3.5 py-2 shadow-xs transition-all rounded-xs ${
          isActivePath
            ? "border-2 border-sale bg-sale/10 ring-2 ring-sale/20 text-foreground"
            : isLeaf
            ? node.prediction === "High"
              ? "border-emerald-600 bg-emerald-50 text-emerald-950"
              : node.prediction === "Medium"
              ? "border-amber-600 bg-amber-50 text-amber-950"
              : "border-rose-600 bg-rose-50 text-rose-950"
            : "border-border bg-card text-foreground hover:border-foreground/40"
        }`}
      >
        {!isLeaf && (
          <button
            type="button"
            onClick={() => onToggleNode(node.id)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            title="Expand/Collapse subtree"
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        <span className="font-bold text-[10px] text-muted-foreground px-1 bg-muted rounded-xs">
          #{node.id}
        </span>

        {isActivePath && (
          <span className="text-[10px] font-bold uppercase bg-sale text-white px-1.5 py-0.2 rounded-xs">
            ★ Active Path
          </span>
        )}

        {isLeaf ? (
          <span className="font-semibold">
            Leaf ➔ <span className="uppercase font-bold underline">{node.prediction} Demand</span> ({node.samples} training items)
          </span>
        ) : (
          <span className="font-medium">
            <span className="font-bold text-sale">{node.condition}</span> · Gini Impurity: {node.impurity} · Samples: {node.samples}
          </span>
        )}

        {/* Class distribution */}
        {node.distribution && (
          <span className="hidden sm:inline-block text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 border border-border/50 rounded-xs">
            H: {node.distribution.High || 0} | M: {node.distribution.Medium || 0} | L: {node.distribution.Low || 0}
          </span>
        )}
      </div>

      {!isLeaf && !isCollapsed && (
        <div className="ml-6 mt-1.5 border-l-2 border-border/70 pl-3.5 space-y-2">
          {node.left && (
            <div>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-xs uppercase">
                ├─ If True (Yes):
              </span>
              <ExplainerTreeNode
                node={node.left}
                activeNodeIds={activeNodeIds}
                dimNonActive={dimNonActive}
                expandedNodes={expandedNodes}
                onToggleNode={onToggleNode}
                depth={depth + 1}
              />
            </div>
          )}
          {node.right && (
            <div>
              <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-xs uppercase">
                └─ If False (No):
              </span>
              <ExplainerTreeNode
                node={node.right}
                activeNodeIds={activeNodeIds}
                dimNonActive={dimNonActive}
                expandedNodes={expandedNodes}
                onToggleNode={onToggleNode}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
