import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore, lineKey } from "@/store/store";
import { track } from "@/lib/events";
import { formatINR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, productsQueryString } from "@/lib/catalog";
import type { Product, ProductListResponse } from "@/types";

export default function CartPage() {
  const { cart, updateQuantity, removeLine } = useStore();
  const navigate = useNavigate();

  const idKey = useMemo(() => [...new Set(cart.map((l) => l.product_id))].join(","), [cart]);
  const { data, isLoading } = useQuery({
    queryKey: ["cart-products", idKey],
    queryFn: () => apiGet<ProductListResponse>(`/products?${productsQueryString({ ids: idKey, limit: 48 })}`),
    enabled: cart.length > 0,
  });

  const byId = useMemo(() => {
    const map = new Map<string, Product>();
    data?.items.forEach((p) => map.set(p.id, p));
    return map;
  }, [data]);

  const resolved = cart.map((line) => ({ line, product: byId.get(line.product_id) }));
  const sellable = resolved.filter((r) => r.product && r.product.stock > 0);
  const subtotal = sellable.reduce((sum, r) => sum + r.product!.price * r.line.quantity, 0);
  const savings = sellable.reduce(
    (sum, r) =>
      sum + (r.product!.original_price && r.product!.original_price > r.product!.price
        ? (r.product!.original_price - r.product!.price) * r.line.quantity
        : 0),
    0,
  );
  const delivery = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + delivery;
  const toFreeDelivery = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="cart-page">
        <EmptyState
          icon={<ShoppingBag size={22} className="text-muted-foreground" />}
          title="Your bag is empty"
          description="Looks like you haven't added anything yet. Explore the latest drops and bestsellers."
          actionLabel="Start Shopping"
          actionTo="/new-arrivals"
          testId="cart-empty-state"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" data-testid="cart-page">
      <div className="mb-8 border-b border-border pb-6">
        <p className="overline-label">Shopping Bag</p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">
          Your Bag ({cart.reduce((s, l) => s + l.quantity, 0)})
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* lines */}
        <div className="space-y-6 lg:col-span-8" data-testid="cart-lines">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {resolved.map(({ line, product }) => {
            const unavailable = !product || product.stock <= 0;
            const overStock = product ? line.quantity > product.stock : false;
            return (
              <div
                key={lineKey(line)}
                data-testid={`cart-line-${line.product_id}`}
                className={`grid grid-cols-[96px_1fr] gap-4 border-b border-border pb-6 sm:grid-cols-[128px_1fr] ${unavailable ? "opacity-60" : ""}`}
              >
                <Link to={`/product/${line.product_id}`} className="block aspect-[3/4] overflow-hidden bg-[#F3EFEA]">
                  <ImageWithFallback
                    src={product?.images[0] ?? ""}
                    alt={product?.name ?? "Product"}
                    className="h-full w-full object-cover"
                  />
                </Link>
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link to={`/product/${line.product_id}`} className="text-sm font-medium hover:text-sale sm:text-base">
                        {product?.name ?? "Product no longer available"}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {product?.sku ?? "—"} · Size: {line.size ?? "—"} · Colour: {line.color ?? "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${product?.name ?? "item"} from bag`}
                      data-testid={`cart-remove-${line.product_id}`}
                      onClick={() => {
                        removeLine(line);
                        toast.success("Removed from your bag");
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-mono text-base font-medium">{formatINR(product?.price ?? 0)}</span>
                    {product?.original_price && product.original_price > product.price && (
                      <span className="font-mono text-xs text-muted-foreground line-through">
                        {formatINR(product.original_price)}
                      </span>
                    )}
                  </div>

                  {unavailable ? (
                    <p className="mt-3 text-xs font-medium text-destructive">This item can't be purchased right now — remove it to continue.</p>
                  ) : overStock ? (
                    <p className="mt-3 text-xs font-medium text-sale">Only {product!.stock} available — quantity updated below.</p>
                  ) : null}

                  <div className="mt-auto flex items-center gap-4 pt-4">
                    <div className="flex items-center border border-border" data-testid={`cart-qty-${line.product_id}`}>
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        data-testid={`cart-qty-decrease-${line.product_id}`}
                        onClick={() => updateQuantity(line, line.quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center transition hover:bg-secondary"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center font-mono text-sm" data-testid={`cart-qty-value-${line.product_id}`}>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        data-testid={`cart-qty-increase-${line.product_id}`}
                        onClick={() => {
                          const cap = Math.min(product!.stock, 10);
                          if (line.quantity + 1 > cap) {
                            toast.error(`Only ${cap} available in stock.`);
                            return;
                          }
                          updateQuantity(line, line.quantity + 1);
                        }}
                        className="flex h-9 w-9 items-center justify-center transition hover:bg-secondary"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <p className="ml-auto font-mono text-sm font-medium" data-testid={`cart-line-total-${line.product_id}`}>
                      {formatINR((product?.price ?? 0) * line.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <Link to="/new-arrivals" className={buttonVariants({ variant: "outline", className: "self-start" })} data-testid="cart-continue-shopping">
            Continue Shopping
          </Link>
        </div>

        {/* summary */}
        <aside className="lg:col-span-4">
          <div className="border border-border bg-card p-6 lg:sticky lg:top-32" data-testid="cart-summary">
            <h2 className="font-heading text-2xl font-medium">Order Summary</h2>

            {toFreeDelivery > 0 && (
              <div className="mt-4 border border-dashed border-border bg-background p-3 text-xs leading-relaxed text-muted-foreground" data-testid="cart-free-shipping-progress">
                Add <span className="font-semibold text-foreground">{formatINR(toFreeDelivery)}</span> more for free
                delivery.
                <div className="mt-2 h-1 w-full bg-secondary">
                  <div
                    className="h-full bg-sale transition-all"
                    style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {toFreeDelivery === 0 && (
              <p className="mt-4 border border-dashed border-border bg-background p-3 text-xs font-medium" data-testid="cart-free-shipping-unlocked">
                You've unlocked free delivery.
              </p>
            )}

            <dl className="mt-6 space-y-3 text-sm" aria-busy={isLoading}>
              {isLoading ? (
                <div className="space-y-3" data-testid="cart-summary-loading">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : (
              <>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bag total (MRP)</dt>
                <dd className="font-mono">{formatINR(subtotal + savings)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bag discount</dt>
                <dd className="font-mono text-sale" data-testid="cart-discount-amount">− {formatINR(savings)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-mono" data-testid="cart-delivery-amount">
                  {delivery === 0 ? "Free" : formatINR(delivery)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <dt>Total payable</dt>
                <dd className="font-mono" data-testid="cart-total-amount">{formatINR(total)}</dd>
              </div>
              </>
              )}
            </dl>

            <Button
              size="lg"
              className="mt-6 w-full btn-invert hover:bg-sale"
              disabled={isLoading || subtotal === 0}
              data-testid="cart-checkout-button"
              onClick={() => {
                track("checkout_start");
                navigate("/checkout");
              }}
            >
              Proceed to Checkout <ArrowRight size={16} />
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Cash on Delivery available · No hidden charges</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
