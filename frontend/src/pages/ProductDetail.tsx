import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Banknote, ChevronLeft, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { RatingStars } from "@/components/RatingStars";
import { ProductRail } from "@/components/ProductRail";
import { SectionHeading } from "@/components/SectionHeading";
import { SizeGuideDialog } from "@/components/product/SizeGuideDialog";
import { useStore } from "@/store/store";
import { track } from "@/lib/events";
import { formatINR } from "@/lib/format";
import { COLOR_HEX, FREE_SHIPPING_THRESHOLD } from "@/lib/catalog";
import type { Product, ProductListResponse } from "@/types";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addToCart, toggleWishlist, inWishlist } = useStore();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiGet<Product>(`/products/${id}`),
    retry: false,
  });

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Reset selections when navigating between products.
  useEffect(() => {
    setSize(null);
    setColor(null);
    setQty(1);
    setActiveImage(0);
  }, [id]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} · Salesphere`;
      track("product_view", { productId: product.id });
      setColor(product.colors[0] ?? null);
      setSize(product.sizes.length === 1 ? product.sizes[0] : null);
    }
  }, [product]);

  const related = useQuery({
    queryKey: ["related", product?.subcategory, product?.id],
    queryFn: () =>
      apiGet<ProductListResponse>(
        `/products?subcategory=${encodeURIComponent(product!.subcategory)}&exclude=${product!.id}&limit=8`,
      ),
    enabled: !!product,
  });

  const maxQty = useMemo(() => Math.min(product?.stock ?? 1, 10), [product?.stock]);
  const outOfStock = (product?.stock ?? 0) <= 0;
  const lowStock = (product?.stock ?? 0) > 0 && (product?.stock ?? 0) <= 5;
  const wished = product ? inWishlist(product.id) : false;

  // Colour switching: lead with the selected colour's photo (AI-recoloured), then the rest.
  const gallery = useMemo(() => {
    if (!product) return [];
    const colorImg = color ? product.color_images?.[color] : undefined;
    return colorImg ? [colorImg, ...product.images.filter((x) => x !== colorImg)] : product.images;
  }, [product, color]);

  const handleAddToCart = () => {
    if (!product || outOfStock) return;
    if (product.sizes.length > 0 && !size) {
      toast.error("Please select a size first.");
      return;
    }
    addToCart({ product_id: product.id, size, color, quantity: qty });
    track("add_to_cart", { productId: product.id });
    toast.success(`${product.name} added to your bag`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="product-not-found">
        <p className="overline-label">404</p>
        <h1 className="mt-3 font-heading text-4xl font-medium">Product not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This piece may have sold out or been moved. Explore the latest collection instead.
        </p>
        <Link to="/new-arrivals" className={buttonVariants({ className: "mt-8" })} data-testid="product-not-found-browse">
          Browse New Arrivals
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" data-testid="product-detail-page">
        {/* breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft size={13} /> Home
          </Link>
          <span>/</span>
          <Link to={`/${product.category}`} className="capitalize hover:text-foreground">
            {product.category}
          </Link>
          <span>/</span>
          <span className="truncate text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* gallery */}
          <div className="grid grid-cols-[56px_1fr] gap-3 sm:grid-cols-[72px_1fr]">
            <div className="flex flex-col gap-2">
              {gallery.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  data-testid={`product-gallery-thumb-${i}`}
                  onClick={() => setActiveImage(i)}
                  className={`aspect-[3/4] w-full overflow-hidden border transition ${
                    activeImage === i ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <ImageWithFallback src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="aspect-[3/4] w-full overflow-hidden bg-[#F3EFEA]">
              <ImageWithFallback
                key={activeImage}
                src={gallery[activeImage] ?? ""}
                alt={product.name}
                eager
                className="h-full w-full object-cover animate-fade-up"
              />
            </div>
          </div>

          {/* buy box */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="overline-label">
              {product.category} · {product.subcategory}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight sm:text-4xl" data-testid="product-detail-name">
              {product.name}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">SKU: {product.sku}</p>
            <div className="mt-3">
              <RatingStars rating={product.rating} count={product.rating_count} size={14} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="font-mono text-3xl font-medium" data-testid="product-detail-price">
                {formatINR(product.price)}
              </span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="font-mono text-lg text-muted-foreground line-through">
                    {formatINR(product.original_price)}
                  </span>
                  <span className="bg-sale px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white" data-testid="product-detail-discount">
                    {product.discount_percent}% off
                  </span>
                </>
              )}
            </div>

            {/* stock */}
            <div className="mt-4" data-testid="product-detail-stock">
              {outOfStock ? (
                <p className="text-sm font-medium text-destructive">Out of stock — check back soon.</p>
              ) : lowStock ? (
                <p className="text-sm font-medium text-sale">Only {product.stock} left in stock.</p>
              ) : (
                <p className="text-sm text-muted-foreground">In stock and ready to ship.</p>
              )}
            </div>

            {/* colours */}
            {product.colors.length > 0 && (
              <div className="mt-6">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em]">
                  Colour: <span className="font-normal normal-case tracking-normal text-muted-foreground">{color}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      aria-label={`Select colour ${c}`}
                      aria-pressed={color === c}
                      data-testid={`product-color-${c.replace(/\s/g, "-").toLowerCase()}`}
                      onClick={() => { setColor(c); setActiveImage(0); }}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        color === c ? "border-foreground ring-1 ring-foreground ring-offset-2" : "border-border"
                      }`}
                      style={{ backgroundColor: COLOR_HEX[c] ?? "#D6D1CA" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* sizes */}
            {product.sizes.length > 0 && (
              <div className="mt-6">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                    Size {product.sizes.length > 1 && <span className="font-normal normal-case tracking-normal text-muted-foreground">— select one</span>}
                  </p>
                  <SizeGuideDialog category={product.category} subcategory={product.subcategory} selected={size} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      data-testid={`product-size-${s}`}
                      aria-pressed={size === s}
                      onClick={() => setSize(s)}
                      className={`min-w-11 border px-3 py-2 font-mono text-sm transition ${
                        size === s
                          ? "border-foreground bg-foreground text-white"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* quantity + actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center border border-border" data-testid="product-quantity-selector">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  data-testid="product-qty-decrease"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-11 w-10 items-center justify-center transition hover:bg-secondary disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-mono text-sm" data-testid="product-qty-value">{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  data-testid="product-qty-increase"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  className="flex h-11 w-10 items-center justify-center transition hover:bg-secondary disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
              <Button
                size="lg"
                disabled={outOfStock}
                onClick={handleAddToCart}
                data-testid="product-add-to-cart-button"
                className="min-w-52 flex-1 btn-invert hover:bg-sale"
              >
                <ShoppingBag size={17} /> {outOfStock ? "Out of Stock" : "Add to Bag"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                aria-label="Add to wishlist"
                data-testid="product-wishlist-button"
                onClick={() => {
                  toggleWishlist(product.id);
                  if (!wished) track("wishlist_add", { productId: product.id });
                  toast.success(wished ? "Removed from wishlist" : "Added to your wishlist");
                }}
              >
                <Heart size={17} className={wished ? "fill-sale text-sale" : ""} />
              </Button>
            </div>

            {/* description + policies */}
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground" data-testid="product-detail-description">
              {product.description}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-6 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2.5">
                <BanknoteIcon /> Cash on Delivery available — no extra fees
              </p>
              <p className="flex items-center gap-2.5">
                <Truck size={16} className="text-sale" /> Free delivery over {formatINR(FREE_SHIPPING_THRESHOLD)}
              </p>
              <p className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-sale" /> 7-day easy returns
              </p>
              <p className="flex items-center gap-2.5">
                <Truck size={16} className="text-sale" /> Dispatch within 24–48 hours
              </p>
            </div>
          </div>
        </div>

        {/* related */}
        {related.data && related.data.items.length > 0 && (
          <section className="mt-20" data-testid="product-related">
            <SectionHeading overline="You may also like" title="Complete the Look" linkTo={`/${product.category}`} linkLabel={`All ${product.category}`} />
            <ProductRail products={related.data.items} />
          </section>
        )}
      </div>

      {/* sticky mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="pl-1">
          <p className="font-mono text-lg font-medium leading-none">{formatINR(product.price)}</p>
          {product.original_price && product.original_price > product.price && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground line-through">{formatINR(product.original_price)}</p>
          )}
        </div>
        <Button
          className="flex-1 btn-invert hover:bg-sale"
          disabled={outOfStock}
          onClick={handleAddToCart}
          data-testid="product-mobile-add-to-cart-button"
        >
          {outOfStock ? "Out of Stock" : "Add to Bag"}
        </Button>
      </div>
    </div>
  );
}

function BanknoteIcon() {
  return <Banknote size={16} className="text-sale" />;
}
