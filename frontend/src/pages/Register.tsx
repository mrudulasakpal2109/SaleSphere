import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useRegister } from "@/hooks/useAuth";
import { apiErrorMessage, digitsOnly } from "@/lib/format";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const register = useRegister();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Please enter a valid email address.";
    if (form.phone && !/^\d{10}$/.test(form.phone)) errs.phone = "Mobile number must be 10 digits.";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirm) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    register.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone || null,
        password: form.password,
      },
      {
        onSuccess: () => {
          toast.success("Welcome to Salesphere — your customer account is ready.");
          const dest = next && !next.includes("manager") && !next.includes("admin") ? next : "/account";
          navigate(dest, { replace: true });
        },
        onError: (err) => {
          const msg = apiErrorMessage(err, "Could not create your account. Please try again.");
          if (err instanceof Error && msg.includes("exists")) setErrors({ email: msg });
          else toast.error(msg);
        },
      },
    );
  };

  const field = (
    key: keyof typeof form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <Label htmlFor={`register-${key}`}>{label}</Label>
      <Input
        id={`register-${key}`}
        value={form[key]}
        aria-invalid={!!errors[key]}
        data-testid={`register-${key}-input`}
        onChange={(e) => set(key, props.type === "tel" ? digitsOnly(e.target.value) : e.target.value)}
        className="mt-1.5"
        {...props}
      />
      {errors[key] && (
        <p className="mt-1 text-xs text-destructive" data-testid={`register-${key}-error`}>
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <div className="grid min-h-[calc(100svh-7rem)] grid-cols-1 lg:grid-cols-2" data-testid="register-page">
      <div className="flex items-center justify-center px-4 py-16 sm:px-10">
        <div className="w-full max-w-md">
          <p className="overline-label">Join the circle</p>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">
            Create your Salesphere<span className="text-sale">.</span> account
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Real accounts — your password is hashed and stored in our database, and a secure
            httpOnly session keeps you signed in.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            {field("name", "Full name", { autoComplete: "name", placeholder: "Aarav Sharma" })}
            {field("email", "Email", { type: "email", autoComplete: "email", placeholder: "you@example.com" })}
            {field("phone", "Mobile (optional, 10 digits)", { type: "tel", inputMode: "numeric", placeholder: "9876543210", maxLength: 10 })}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field("password", "Password (min 8 chars)", { type: "password", autoComplete: "new-password", placeholder: "••••••••" })}
              {field("confirm", "Confirm password", { type: "password", autoComplete: "new-password", placeholder: "••••••••" })}
            </div>
            <Button type="submit" size="lg" className="w-full btn-invert hover:bg-sale" disabled={register.isPending} data-testid="register-submit-button">
              {register.isPending ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium underline underline-offset-4 hover:text-sale" data-testid="register-login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1720477188105-ab105c15bb33?auto=format&fit=crop&w=1200&q=80"
          alt="Salesphere editorial campaign"
          eager
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-[#121212]/40" />
        <div className="absolute bottom-12 left-12 max-w-sm text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F5C29A]">One account, everything</p>
          <p className="mt-3 font-heading text-4xl font-medium leading-tight">
            Wishlists, orders and addresses — all in your sphere.
          </p>
        </div>
      </div>
    </div>
  );
}
