import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Boxes, LayoutDashboard, LogOut, PieChart, Store, Users, UsersRound, Table, Database, GitFork } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagerLogout, useManagerMe } from "@/hooks/useManager";

const NAV = [
  { to: "/manager", label: "Overview", icon: LayoutDashboard, end: true, testId: "manager-nav-overview" },
  { to: "/manager/transactions", label: "Transactions", icon: Table, testId: "manager-nav-transactions" },
  { to: "/manager/etl", label: "Warehouse & ETL", icon: Database, testId: "manager-nav-etl" },
  { to: "/manager/inventory", label: "Inventory", icon: Boxes, testId: "manager-nav-inventory" },
  { to: "/manager/demand-predictor", label: "Demand Predictor", icon: GitFork, testId: "manager-nav-demand" },
  { to: "/manager/customers", label: "Customers", icon: Users, testId: "manager-nav-customers" },
  { to: "/manager/segmentation", label: "RFM & Segments", icon: PieChart, testId: "manager-nav-segmentation" },
  { to: "/manager/team", label: "Team", icon: UsersRound, testId: "manager-nav-team" },
];

export default function ManagerLayout() {
  const { data: manager, isLoading } = useManagerMe();
  const logout = useManagerLogout();
  const navigate = useNavigate();

  if (isLoading) return <div className="p-10"><Skeleton className="h-64 w-full" /></div>;
  if (!manager) return <Navigate to="/manager/login" replace />;

  return (
    <div className="flex min-h-svh flex-col bg-[#F5F2EE] lg:flex-row" data-testid="manager-layout">
      <aside className="flex shrink-0 flex-col bg-[#121212] text-[#E5DFD7] lg:sticky lg:top-0 lg:h-svh lg:w-60">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <Link to="/manager" className="block">
            <p className="font-heading text-2xl tracking-tight text-white">Salesphere<span className="text-sale">.</span></p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8F877D]">Manager</p>
          </Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:pb-0" aria-label="Manager">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testId}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-[#2A2622] text-white" : "text-[#B5AEA4] hover:text-white"}`
              }
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-[#2E2A27] p-4 lg:block">
          <p className="truncate text-sm text-white" data-testid="manager-name">{manager.name}</p>
          <p className="truncate text-xs text-[#8F877D]">{manager.email} · {manager.role}</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link to="/" className="inline-flex items-center gap-1 text-[#B5AEA4] hover:text-white"><Store size={13} /> Store</Link>
            <button
              type="button"
              data-testid="manager-signout-button"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/manager/login", { replace: true }) })}
              className="inline-flex items-center gap-1 text-[#B5AEA4] hover:text-white"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
        <Outlet context={manager} />
      </main>
    </div>
  );
}
