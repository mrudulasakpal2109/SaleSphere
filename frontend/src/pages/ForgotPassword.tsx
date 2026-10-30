import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage } from "@/lib/format";
import type { MessageOut } from "@/types";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<MessageOut | null>(null);

  const request = useMutation({
    mutationFn: (body: { email: string }) => apiPost<MessageOut>("/auth/forgot-password", body),
    onSuccess: (res) => setSent(res),
    onError: (err) => setSent({ ok: false, message: apiErrorMessage(err, "Could not process the request.") }),
  });

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6" data-testid="forgot-password-page">
      <p className="overline-label">Account recovery</p>
      <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">Forgot password</h1>

      {sent ? (
        <div className="mt-8 border border-border bg-card p-6" data-testid="forgot-password-result">
          <p className="text-sm leading-relaxed">{sent.message}</p>
          <Link to="/login" className={buttonVariants({ variant: "outline", className: "mt-6 w-full" })} data-testid="forgot-password-back-login">
            Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Enter the email on your account and we'll generate a password reset link.
          </p>
          <form
            className="mt-8 space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
              request.mutate({ email: email.trim() });
            }}
          >
            <div>
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                data-testid="forgot-password-email-input"
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" size="lg" className="w-full btn-invert hover:bg-sale" disabled={request.isPending} data-testid="forgot-password-submit-button">
              {request.isPending ? "Generating…" : "Generate Reset Link"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-medium underline underline-offset-4 hover:text-sale" data-testid="forgot-password-login-link">
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
