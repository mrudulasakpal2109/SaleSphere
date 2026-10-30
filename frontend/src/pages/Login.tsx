import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useLogin } from "@/hooks/useAuth";
import { useManagerLogin } from "@/hooks/useManager";
import { apiErrorMessage } from "@/lib/format";

type AuthTab = "customer" | "manager";

export default function Login() {
  const [params] = useSearchParams();
  const initialTab: AuthTab = params.get("role") === "manager" ? "manager" : "customer";
  const [tab, setTab] = useState<AuthTab>(initialTab);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const managerLogin = useManagerLogin();
  const navigate = useNavigate();
  const next = params.get("next") || "/";

  const isSubmitting = login.isPending || managerLogin.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const isLikelyManager =
      tab === "manager" ||
      trimmedEmail.toLowerCase() === "admin@salesphere.in" ||
      trimmedEmail.toLowerCase().includes("manager");

    if (isLikelyManager) {
      // Execute Manager Authentication
      managerLogin.mutate(
        { email: trimmedEmail, password },
        {
          onSuccess: (mgr) => {
            toast.success(`Welcome to Sales Manager Portal, ${mgr.name}.`);
            navigate("/manager", { replace: true });
          },
          onError: (err) => {
            // If manager login failed and tab was customer, fallback to customer login
            if (tab === "customer") {
              login.mutate(
                { email: trimmedEmail, password },
                {
                  onSuccess: async () => {
                    toast.success("Welcome back to Salesphere.");
                    navigate(next, { replace: true });
                  },
                  onError: (custErr) =>
                    setError(apiErrorMessage(custErr, "Could not sign in. Please verify your credentials.")),
                },
              );
            } else {
              setError(apiErrorMessage(err, "Invalid manager credentials. Please check and try again."));
            }
          },
        },
      );
    } else {
      // Execute Customer Authentication
      login.mutate(
        { email: trimmedEmail, password },
        {
          onSuccess: async () => {
            toast.success("Welcome back to Salesphere.");
            navigate(next, { replace: true });
          },
          onError: () => {
            // Auto-check if user was trying manager credentials
            managerLogin.mutate(
              { email: trimmedEmail, password },
              {
                onSuccess: (mgr) => {
                  toast.success(`Manager credentials recognized. Welcome, ${mgr.name}!`);
                  navigate("/manager", { replace: true });
                },
                onError: (finalErr) =>
                  setError(apiErrorMessage(finalErr, "Could not sign in. Please verify your credentials.")),
              },
            );
          },
        },
      );
    }
  };

  const fillCustomerDemo = () => {
    setTab("customer");
    setEmail("demo@salesphere.in");
    setPassword("Demo@1234");
    setError(null);
  };

  const fillManagerDemo = () => {
    setTab("manager");
    setEmail("admin@salesphere.in");
    setPassword("Manager@1234");
    setError(null);
  };

  return (
    <div className="grid min-h-[calc(100svh-7rem)] grid-cols-1 lg:grid-cols-2" data-testid="login-page">
      {/* campaign panel */}
      <div className="relative hidden lg:block">
        <ImageWithFallback
          src="https://images.pexels.com/photos/3155493/pexels-photo-3155493.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Salesphere seasonal campaign"
          eager
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-[#121212]/50" />
        <div className="absolute bottom-12 left-12 max-w-md text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5C29A]">
            {tab === "manager" ? "Sales Intelligence Platform" : "Members get more"}
          </p>
          <p className="mt-3 font-heading text-4xl font-medium leading-tight">
            {tab === "manager"
              ? "Star Schema Data Warehouse, RFM Analytics & K-Means Customer Intelligence."
              : "Early sale access, faster checkout, curated fashion and order tracking."}
          </p>
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {/* Dual Role Selector Tabs */}
          <div className="mb-6 flex border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => {
                setTab("customer");
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                tab === "customer"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-customer-login"
            >
              <User size={14} /> Customer Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("manager");
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                tab === "manager"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-manager-login"
            >
              <ShieldCheck size={14} /> Manager Portal
            </button>
          </div>

          <p className="overline-label">
            {tab === "manager" ? "Sales Manager & Admin Access" : "Welcome back"}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight sm:text-4xl">
            {tab === "manager" ? (
              <>
                Sales Manager Portal<span className="text-sale">.</span>
              </>
            ) : (
              <>
                Sign in to Salesphere<span className="text-sale">.</span>
              </>
            )}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tab === "manager"
              ? "Sign in to inspect DWM warehouse metrics, 45k transactions, and RFM clusters."
              : "Sign in with your customer account to manage cart, orders, and addresses."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <Label htmlFor="login-email">
                {tab === "manager" ? "Manager Email" : "Email Address"}
              </Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                data-testid="login-email-input"
                placeholder={tab === "manager" ? "admin@salesphere.in" : "you@example.com"}
              />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                data-testid="login-password-input"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p
                className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
                data-testid="login-error-message"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full btn-invert hover:bg-sale"
              disabled={isSubmitting}
              data-testid="login-submit-button"
            >
              {isSubmitting
                ? "Signing in…"
                : tab === "manager"
                  ? "Sign in to Manager Portal"
                  : "Sign In"}
            </Button>
          </form>

          {tab === "customer" && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link
                to="/forgot-password"
                className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                data-testid="login-forgot-link"
              >
                Forgot password?
              </Link>
              <Link
                to={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="font-medium underline underline-offset-4 hover:text-sale"
                data-testid="login-register-link"
              >
                Create account
              </Link>
            </div>
          )}

          {/* Quick Demo Credentials Box for College Viva & Evaluation */}
          <div className="mt-6 border border-dashed border-border bg-card p-4 text-xs">
            <p className="font-semibold uppercase tracking-[0.14em]">Demo Logins (Click to Auto-Fill)</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={tab === "customer" ? "default" : "outline"}
                size="sm"
                className="h-auto flex-col items-start p-2.5 text-left"
                data-testid="fill-customer-demo-button"
                onClick={fillCustomerDemo}
              >
                <span className="font-medium">Customer Demo</span>
                <span className="font-mono text-[10px] opacity-80">demo@salesphere.in</span>
              </Button>

              <Button
                type="button"
                variant={tab === "manager" ? "default" : "outline"}
                size="sm"
                className="h-auto flex-col items-start p-2.5 text-left"
                data-testid="fill-manager-demo-button"
                onClick={fillManagerDemo}
              >
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck size={12} /> Manager Demo
                </span>
                <span className="font-mono text-[10px] opacity-80">admin@salesphere.in</span>
              </Button>
            </div>
          </div>

          {/* Direct link to dedicated Manager Portal */}
          <div className="mt-4 border-t border-border pt-4 text-center">
            <Link
              to="/manager/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-sale"
            >
              Looking for dedicated Manager Portal? Go to /manager/login <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
