import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-28 text-center" data-testid="not-found-page">
      <p className="overline-label">404 — Page not found</p>
      <h1 className="mt-4 font-heading text-5xl font-medium tracking-tight">Lost in the sphere?</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The page you're looking for doesn't exist or has moved. Let's get you back to the good stuff.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={buttonVariants({})} data-testid="not-found-home-button">
          Back to Home
        </Link>
        <Link to="/sale" className={buttonVariants({ variant: "outline" })} data-testid="not-found-sale-button">
          Shop the Sale
        </Link>
      </div>
    </div>
  );
}
