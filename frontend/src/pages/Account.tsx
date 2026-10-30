import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Heart, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useAuth";
import { endSession } from "@/lib/session";
import { cn } from "@/lib/utils";

// Guarded account shell: sidebar + nested routes. Redirects to /login when signed out.
export default function Account() {
  const { data: user, isLoading } = useMe();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-8 h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const links = [
    { to: "/account", label: "My Profile", icon: UserRound, end: true, testId: "account-nav-profile" },
    { to: "/account/orders", label: "My Orders", icon: Package, testId: "account-nav-orders" },
    { to: "/account/addresses", label: "Addresses", icon: MapPin, testId: "account-nav-addresses" },
    { to: "/wishlist", label: "Wishlist", icon: Heart, testId: "account-nav-wishlist" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" data-testid="account-page">
      <div className="mb-8 border-b border-border pb-6">
        <p className="overline-label">My Account</p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">Hello, {user.name.split(" ")[0]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Member since {new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Account">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                data-testid={l.testId}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 border px-4 py-3 text-sm transition hover:border-foreground",
                  (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to))
                    ? "border-foreground bg-card font-medium"
                    : "border-border",
                )}
              >
                <l.icon size={16} /> {l.label}
              </Link>
            ))}
            <button
              type="button"
              data-testid="account-signout-button"
              onClick={async () => {
                await endSession();
                toast.success("Signed out. See you soon.");
                navigate("/");
              }}
              className="flex shrink-0 items-center gap-2.5 border border-border px-4 py-3 text-sm text-destructive transition hover:border-destructive"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </nav>
        </aside>

        <div className="lg:col-span-9">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
