import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types";

// Editorial product rail: horizontal snap-scroll on mobile, 4-up grid on desktop.
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
      {products.map((p) => (
        <div key={p.id} className="w-[68%] flex-shrink-0 snap-start sm:w-[42%] lg:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
