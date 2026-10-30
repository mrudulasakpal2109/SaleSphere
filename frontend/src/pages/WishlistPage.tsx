import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ProductGrid } from "@/components/ProductGrid";
import { useStore } from "@/store/store";
import { productsQueryString } from "@/lib/catalog";
import type { ProductListResponse } from "@/types";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useStore();
  const idKey = useMemo(() => wishlist.join(","), [wishlist]);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist-products", idKey],
    queryFn: () => apiGet<ProductListResponse>(`/products?${productsQueryString({ ids: idKey, limit: 48 })}`),
    enabled: wishlist.length > 0,
  });

  const items = (data?.items ?? []).filter((p) => wishlist.includes(p.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" data-testid="wishlist-page">
      <div className="mb-8 border-b border-border pb-6">
        <p className="overline-label">Saved for later</p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">My Wishlist</h1>
        {wishlist.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground" data-testid="wishlist-count">
            {wishlist.length} item{wishlist.length === 1 ? "" : "s"} saved
          </p>
        )}
      </div>

      {wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart size={22} className="text-muted-foreground" />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here for later."
          actionLabel="Browse Products"
          actionTo="/new-arrivals"
          testId="wishlist-empty-state"
        />
      ) : isLoading ? (
        <ProductGrid products={[]} isLoading />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={22} className="text-muted-foreground" />}
          title="These pieces are no longer available"
          description="The items you saved have been removed from the catalogue. Explore what's new."
          actionLabel="Browse New Arrivals"
          actionTo="/new-arrivals"
          testId="wishlist-unavailable-state"
        />
      ) : (
        <>
          <ProductGrid products={items} />
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => {
                items.forEach((p) => toggleWishlist(p.id));
                toast.success("Wishlist cleared");
              }}
              className="text-xs uppercase tracking-[0.16em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              data-testid="wishlist-clear-button"
            >
              Clear wishlist
            </button>
          </div>
        </>
      )}
    </div>
  );
}
