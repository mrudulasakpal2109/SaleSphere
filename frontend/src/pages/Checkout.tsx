import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useMe } from "@/hooks/useAuth";
import { useStore, lineKey } from "@/store/store";
import { track } from "@/lib/events";
import { apiErrorMessage, digitsOnly, formatINR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, productsQueryString } from "@/lib/catalog";
import type { Address, Order, Product, ProductListResponse } from "@/types";

interface FieldErrors {
  [key: string]: string | undefined;
}

export default function Checkout() {
  const { cart, clearCart } = useStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useMe();

  const idKey = useMemo(() => [...new Set(cart.map((l) => l.product_id))].join(","), [cart]);
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["cart-products", idKey],
    queryFn: () => apiGet<ProductListResponse>(`/products?${productsQueryString({ ids: idKey, limit: 48 })}`),
    enabled: cart.length > 0,
  });

  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: () => apiGet<Address[]>("/addresses"),
    enabled: !!user,
  });

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [addressId, setAddressId] = useState<string>("new");
  const [saveAddress, setSaveAddress] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Prefill from the signed-in account + default address.
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customer_name: f.customer_name || user.name,
        customer_email: f.customer_email || user.email,
        customer_phone: f.customer_phone || user.phone || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (user && addresses.data && addresses.data.length > 0) {
      const def = addresses.data.find((a) => a.is_default) ?? addresses.data[0];
      setAddressId(def.id);
      setForm((f) => ({
        ...f,
        line1: def.line1,
        line2: def.line2 ?? "",
        city: def.city,
        state: def.state,
        postal_code: def.postal_code,
        customer_phone: f.customer_phone || def.phone,
        customer_name: f.customer_name || def.full_name,
      }));
    }
  }, [user, addresses.data]);

  useEffect(() => {
    if (cart.length > 0) track("checkout_start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = useMemo(() => {
    const map = new Map<string, Product>();
    productsData?.items.forEach((p) => map.set(p.id, p));
    return map;
  }, [productsData]);

  const sellable = cart
    .map((line) => ({ line, product: byId.get(line.product_id) }))
    .filter((r) => r.product && r.product.stock >= r.line.quantity);
  const subtotal = sellable.reduce((sum, r) => sum + r.product!.price * r.line.quantity, 0);
  const savings = sellable.reduce(
    (sum, r) =>
      sum + (r.product!.original_price && r.product!.original_price > r.product!.price
        ? (r.product!.original_price - r.product!.price) * r.line.quantity
        : 0),
    0,
  );
  const delivery = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + delivery;

  const placeOrder = useMutation({
    mutationFn: (body: unknown) => apiPost<Order>("/orders", body),
    onSuccess: async (order) => {
      qc.setQueryData(["order", order.id], order);
      clearCart();
      toast.success(`Order ${order.id} placed — pay ${formatINR(order.total)} on delivery.`);
      navigate(`/order-confirmation/${order.id}`, { replace: true });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "We couldn't place your order. Please try again."));
      qc.invalidateQueries({ queryKey: ["cart-products"] });
    },
  });

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (form.customer_name.trim().length < 2) next.customer_name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())) next.customer_email = "Please enter a valid email address.";
    if (!/^\d{10}$/.test(form.customer_phone)) next.customer_phone = "Please enter a 10-digit mobile number.";
    if (form.line1.trim().length < 4) next.line1 = "Please enter your street address.";
    if (form.city.trim().length < 2) next.city = "Please enter your city.";
    if (form.state.trim().length < 2) next.state = "Please enter your state.";
    if (!/^\d{6}$/.test(form.postal_code)) next.postal_code = "Please enter a 6-digit PIN code.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (cart.length === 0) return;
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    placeOrder.mutate({
      items: cart.map((l) => ({ product_id: l.product_id, size: l.size, color: l.color, quantity: l.quantity })),
      customer_name: form.customer_name.trim(),
      customer_email: form.customer_email.trim(),
      customer_phone: form.customer_phone,
      shipping_address: {
        full_name: form.customer_name.trim(),
        phone: form.customer_phone,
        line1: form.line1.trim(),
        line2: form.line2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim(),
        postal_code: form.postal_code,
      },
      payment_method: "COD",
      save_address: saveAddress && !!user,
    });
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="checkout-empty">
        <p className="overline-label">Checkout</p>
        <h1 className="mt-3 font-heading text-4xl font-medium">Your bag is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">Add something you love before checking out.</p>
        <Link to="/new-arrivals" className={buttonVariants({ className: "mt-8" })} data-testid="checkout-empty-browse">
          Browse New Arrivals
        </Link>
      </div>
    );
  }

  const field = (
    name: keyof typeof form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <Label htmlFor={`checkout-${name}`}>{label}</Label>
      <Input
        id={`checkout-${name}`}
        value={form[name]}
        aria-invalid={!!errors[name]}
        data-testid={`checkout-${name}-input`}
        onChange={(e) => setForm((f) => ({ ...f, [name]: props.type === "tel" ? digitsOnly(e.target.value) : e.target.value }))}
        className="mt-1.5"
        {...props}
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-destructive" data-testid={`checkout-${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" data-testid="checkout-page">
      <div className="mb-8 border-b border-border pb-6">
        <p className="overline-label">Secure Checkout</p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* form */}
        <div className="space-y-10 lg:col-span-7">
          <section>
            <h2 className="font-heading text-2xl font-medium">1. Contact details</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">{field("customer_name", "Full name", { autoComplete: "name", placeholder: "Aarav Sharma" })}</div>
              <div className="sm:col-span-1">{field("customer_email", "Email", { type: "email", autoComplete: "email", placeholder: "you@example.com" })}</div>
              <div>{field("customer_phone", "Mobile number (10 digits)", { type: "tel", inputMode: "numeric", placeholder: "9876543210" })}</div>
            </div>
            {!user && (
              <p className="mt-3 text-xs text-muted-foreground">
                Checking out as a guest.{" "}
                <Link to="/login?next=/checkout" className="underline underline-offset-2 hover:text-foreground">
                  Sign in
                </Link>{" "}
                to save your details and track orders.
              </p>
            )}
          </section>

          <section>
            <h2 className="font-heading text-2xl font-medium">2. Delivery address</h2>
            {user && addresses.data && addresses.data.length > 0 && (
              <div className="mt-4 space-y-2">
                {addresses.data.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 border p-4 text-sm transition ${
                      addressId === a.id ? "border-foreground bg-card" : "border-border hover:border-foreground"
                    }`}
                    data-testid={`checkout-address-option-${a.id}`}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="mt-1"
                      checked={addressId === a.id}
                      onChange={() => {
                        setAddressId(a.id);
                        setForm((f) => ({
                          ...f,
                          customer_name: a.full_name,
                          customer_phone: a.phone,
                          line1: a.line1,
                          line2: a.line2 ?? "",
                          city: a.city,
                          state: a.state,
                          postal_code: a.postal_code,
                        }));
                      }}
                    />
                    <span>
                      <span className="font-medium">
                        {a.label ?? "Address"} {a.is_default && <span className="ml-1 text-xs text-muted-foreground">(default)</span>}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
                        {a.city}, {a.state} {a.postal_code} · {a.phone}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-3 border p-4 text-sm transition ${
                    addressId === "new" ? "border-foreground bg-card" : "border-border hover:border-foreground"
                  }`}
                  data-testid="checkout-address-option-new"
                >
                  <input type="radio" name="address" className="mt-0.5" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                  <span className="inline-flex items-center gap-2 font-medium">
                    <MapPin size={15} /> Use a new address
                  </span>
                </label>
              </div>
            )}

            {(!user || addresses.data?.length === 0 || addressId === "new") && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">{field("line1", "Address line 1 (house no, street)", { autoComplete: "address-line1", placeholder: "221, Residency Road" })}</div>
                <div className="sm:col-span-2">{field("line2", "Address line 2 (area, landmark — optional)", { autoComplete: "address-line2", placeholder: "Ashok Nagar" })}</div>
                {field("city", "City", { placeholder: "Bengaluru" })}
                {field("state", "State", { placeholder: "Karnataka" })}
                {field("postal_code", "PIN code (6 digits)", { inputMode: "numeric", placeholder: "560025", maxLength: 6 })}
                {user && (
                  <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
                    <Checkbox checked={saveAddress} onCheckedChange={(c) => setSaveAddress(c === true)} />
                    Save this address to my account
                  </label>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-heading text-2xl font-medium">3. Payment</h2>
            <div className="mt-4 border border-foreground bg-card p-5" data-testid="checkout-cod-option">
              <div className="flex items-start gap-3">
                <input type="radio" checked readOnly className="mt-1" aria-label="Cash on Delivery" />
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <Banknote size={17} className="text-sale" /> Cash on Delivery
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Pay in cash when your order arrives at your doorstep. No extra fees, no advance payment.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              More payment options (UPI, cards, net banking) will arrive in a later phase.
            </p>
          </section>
        </div>

        {/* summary */}
        <aside className="lg:col-span-5">
          <div className="border border-border bg-card p-6 lg:sticky lg:top-32" data-testid="checkout-order-summary">
            <h2 className="font-heading text-2xl font-medium">Order summary</h2>
            <div className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-1">
              {isLoading && <p className="text-sm text-muted-foreground">Loading your bag…</p>}
              {sellable.map(({ line, product }) => (
                <div key={lineKey(line)} className="flex gap-3" data-testid={`checkout-summary-item-${line.product_id}`}>
                  <div className="h-20 w-16 shrink-0 overflow-hidden bg-[#F3EFEA]">
                    <ImageWithFallback src={product!.images[0] ?? ""} alt={product!.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col text-sm">
                    <p className="font-medium leading-snug">{product!.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {line.size ?? "One size"} · {line.color ?? "—"} · Qty {line.quantity}
                    </p>
                    <p className="mt-auto font-mono text-sm">{formatINR(product!.price * line.quantity)}</p>
                  </div>
                </div>
              ))}
              {cart.length > sellable.length && (
                <p className="border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Some items in your bag are unavailable or over stock — they are excluded from this order.
                </p>
              )}
            </div>

            <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono" data-testid="checkout-subtotal">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bag discount</dt>
                <dd className="font-mono text-sale" data-testid="checkout-discount">− {formatINR(savings)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-mono" data-testid="checkout-delivery">{delivery === 0 ? "Free" : formatINR(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                <dt>Amount payable on delivery</dt>
                <dd className="font-mono" data-testid="checkout-total">{formatINR(total)}</dd>
              </div>
            </dl>

            <Button
              size="lg"
              className="mt-6 w-full btn-invert hover:bg-sale"
              onClick={submit}
              disabled={placeOrder.isPending || isLoading || sellable.length === 0}
              data-testid="checkout-place-order-button"
            >
              {placeOrder.isPending ? "Placing your order…" : `Place Order · ${formatINR(total)} COD`}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck size={13} /> Orders are validated against live stock before confirmation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
