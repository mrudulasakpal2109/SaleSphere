import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage } from "@/lib/format";

interface NewsletterResponse {
  ok: boolean;
  message?: string;
}

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = useMutation({
    mutationFn: (body: { email: string }) => apiPost<NewsletterResponse>("/newsletter", body),
    onSuccess: (res) => {
      setSubscribed(true);
      if (res.message) toast.success(res.message);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not subscribe right now. Please try again.")),
  });

  return (
    <section className="bg-stone-subtle" data-testid="newsletter-section">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="overline-label">The Salesphere Circle</p>
          <h2 className="mt-2 font-heading text-3xl font-medium tracking-tight sm:text-4xl">
            Get early access to sales
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Season drops, members-only prices and style edits — straight to your inbox. No spam, ever.
          </p>
          {subscribed ? (
            <p className="mt-8 border border-foreground bg-card px-6 py-4 text-sm font-medium" data-testid="newsletter-success-message" role="status">
              You're on the list. Watch your inbox for early sale access.
            </p>
          ) : (
            <form
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                const value = email.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                  toast.error("Please enter a valid email address.");
                  return;
                }
                subscribe.mutate({ email: value });
              }}
              data-testid="newsletter-form"
            >
              <div className="flex-1 text-left">
                <Label htmlFor="newsletter-email" className="sr-only">Email address</Label>
                <Input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 bg-card"
                  data-testid="newsletter-email-input"
                />
              </div>
              <Button type="submit" size="lg" disabled={subscribe.isPending} data-testid="newsletter-subscribe-button" className="btn-invert hover:bg-sale">
                {subscribe.isPending ? "Subscribing…" : "Subscribe"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
