import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Package, ReceiptText, Truck } from "lucide-react";
import { apiGet } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useAuth";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import type { Order } from "@/types";

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useMe();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiGet<Order>(`/orders/${id}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mt-4 h-6 w-1/3" />
        <Skeleton className="mt-10 h-64 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="order-confirmation-not-found">
        <p className="overline-label">Order</p>
        <h1 className="mt-3 font-heading text-4xl font-medium">Order not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn't find this order. If you just placed it, check your order history or contact support.
        </p>
        <Link to="/new-arrivals" className={buttonVariants({ className: "mt-8" })} data-testid="order-confirmation-not-found-continue">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6" data-testid="order-confirmation-page">
      {/* success header */}
      <div className="text-center">
        <CheckCircle2 size={48} className="mx-auto text-[#15803D]" />
        <p className="overline-label mt-4">Order confirmed</p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight sm:text-5xl">
          Thank you, {order.customer_name.split(" ")[0]}!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your order <span className="font-mono font-semibold text-foreground" data-testid="order-confirmation-id">{order.id}</span> has been
          placed. Keep {formatINR(order.total)} ready — pay in cash when it arrives.
        </p>
      </div>

      {/* status badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3" data-testid="order-confirmation-status">
        <span className="border border-foreground px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
          Order status: {order.status}
        </span>
        <span className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Payment: {order.payment_method} · {order.payment_status}
        </span>
        <span className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Truck size={13} /> Expected within 5–7 business days
        </span>
      </div>

      {/* items */}
      <section className="mt-10 border border-border bg-card p-6" data-testid="order-confirmation-items">
        <h2 className="flex items-center gap-2 font-heading text-2xl font-medium">
          <Package size={19} /> Your items ({order.items.length})
        </h2>
        <div className="mt-5 space-y-5">
          {order.items.map((item) => (
            <div key={`${item.product_id}-${item.size ?? ""}-${item.color ?? ""}`} className="flex gap-4" data-testid={`order-confirmation-item-${item.sku}`}>
              <div className="h-24 w-20 shrink-0 overflow-hidden bg-[#F3EFEA]">
                <ImageWithFallback src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  SKU {item.sku} · Size {item.size ?? "One size"} · {item.color ?? "—"} · Qty {item.quantity}
                </p>
                <p className="mt-auto font-mono text-sm font-medium">{formatINR(item.line_total)}</p>
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-6 space-y-2.5 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono">{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-mono text-sale">− {formatINR(order.discount_total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="font-mono">{order.delivery_charge === 0 ? "Free" : formatINR(order.delivery_charge)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2.5 text-base font-medium">
            <dt>Total payable on delivery</dt>
            <dd className="font-mono" data-testid="order-confirmation-total">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </section>

      {/* delivery + payment */}
      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-medium">
            <Truck size={17} /> Delivery address
          </h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-muted-foreground" data-testid="order-confirmation-address">
            <span className="font-medium text-foreground">{order.shipping_address.full_name}</span>
            <br />
            {order.shipping_address.line1}
            {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}
            <br />
            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
            <br />
            Phone: {order.shipping_address.phone}
          </address>
        </div>
        <div className="border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-heading text-xl font-medium">
            <ReceiptText size={17} /> Order details
          </h2>
          <dl className="mt-3 space-y-2 text-sm text-muted-foreground" data-testid="order-confirmation-details">
            <div className="flex justify-between gap-4">
              <dt>Payment method</dt>
              <dd className="font-medium text-foreground">Cash on Delivery</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Payment status</dt>
              <dd className="font-medium text-foreground">{order.payment_status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Placed on</dt>
              <dd className="font-medium text-foreground">{formatDateTime(order.placed_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Confirmation sent to</dt>
              <dd className="max-w-[60%] truncate text-right font-medium text-foreground">{order.customer_email}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* actions */}
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/new-arrivals"
          className={buttonVariants({ size: "lg", className: "w-full sm:w-auto btn-invert hover:bg-sale" })}
          data-testid="order-confirmation-continue-shopping"
        >
          Continue Shopping
        </Link>
        {user && (
          <Link
            to="/account/orders"
            className={buttonVariants({ size: "lg", variant: "outline", className: "w-full sm:w-auto" })}
            data-testid="order-confirmation-view-orders"
          >
            View My Orders
          </Link>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Placed {formatDate(order.placed_at)} · A record of this order supports future analytics (RFM) as{" "}
        {order.status === "Cancelled" ? "a cancelled order — never counted as a sale" : "a pending-COD transaction"}.
      </p>
    </div>
  );
}
