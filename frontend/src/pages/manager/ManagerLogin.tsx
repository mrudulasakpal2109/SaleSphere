import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useManagerLogin, useManagerMe } from "@/hooks/useManager";
import { apiErrorMessage } from "@/lib/format";

export default function ManagerLogin() {
  const { data: manager } = useManagerMe();
  const login = useManagerLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (manager) return <Navigate to="/manager" replace />;

  const fillDemo = () => {
    setEmail("admin@salesphere.in");
    setPassword("Manager@1234");
    setError(null);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#121212] px-4" data-testid="manager-login-page">
      <div className="w-full max-w-md border border-[#2E2A27] bg-[#FAF8F5] p-8 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-heading text-3xl tracking-tight">
            Salesphere<span className="text-sale">.</span>
          </p>
          <Link
            to="/login"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={13} /> Customer Login
          </Link>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldCheck size={14} className="text-sale" /> Sales Manager & Admin Portal
        </p>

        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            login.mutate(
              { email: email.trim(), password },
              {
                onSuccess: (m) => {
                  toast.success(`Welcome, ${m.name}.`);
                  navigate("/manager", { replace: true });
                },
                onError: (err) => setError(apiErrorMessage(err, "Could not sign in.")),
              },
            );
          }}
        >
          <div>
            <Label htmlFor="mgr-email">Manager Email</Label>
            <Input
              id="mgr-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              placeholder="admin@salesphere.in"
              data-testid="manager-login-email-input"
            />
          </div>
          <div>
            <Label htmlFor="mgr-password">Password</Label>
            <Input
              id="mgr-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
              placeholder="••••••••"
              data-testid="manager-login-password-input"
            />
          </div>
          {error && (
            <p
              className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
              data-testid="manager-login-error"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full hover:bg-sale"
            disabled={login.isPending}
            data-testid="manager-login-submit-button"
          >
            {login.isPending ? "Signing in…" : "Sign in to Manager Dashboard"}
          </Button>
        </form>

        <div className="mt-6 border border-dashed border-border bg-card p-3.5 text-xs">
          <p className="font-semibold uppercase tracking-[0.14em]">Evaluation Credentials</p>
          <p className="mt-1 text-muted-foreground">
            Default manager account: <code className="bg-muted px-1">admin@salesphere.in</code> /{" "}
            <code className="bg-muted px-1">Manager@1234</code>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2.5 w-full text-xs"
            onClick={fillDemo}
            data-testid="fill-manager-credentials-btn"
          >
            Fill Demo Manager Credentials
          </Button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Protected DWM portal. Sessions are authenticated via HTTP-only security cookies.
        </p>
      </div>
    </div>
  );
}
