import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { CartLine } from "@/types";

// Cart + wishlist state, persisted to localStorage (migrates to server-side
// persistence later — lines only carry product ids + selections, never prices).

const CART_KEY = "salesphere_cart_v1";
const WISHLIST_KEY = "salesphere_wishlist_v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function lineKey(line: Pick<CartLine, "product_id" | "size" | "color">): string {
  return `${line.product_id}|${line.size ?? ""}|${line.color ?? ""}`;
}

interface StoreState {
  cart: CartLine[];
  cartCount: number;
  wishlist: string[];
  addToCart: (line: CartLine) => void;
  updateQuantity: (line: Pick<CartLine, "product_id" | "size" | "color">, quantity: number) => void;
  removeLine: (line: Pick<CartLine, "product_id" | "size" | "color">) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  inWishlist: (productId: string) => boolean;
}

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => load<CartLine[]>(CART_KEY, []));
  const [wishlist, setWishlist] = useState<string[]>(() => load<string[]>(WISHLIST_KEY, []));

  const persistCart = useCallback((next: CartLine[]) => {
    setCart(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
  }, []);

  const addToCart = useCallback(
    (line: CartLine) => {
      const next = [...cart];
      const key = lineKey(line);
      const idx = next.findIndex((l) => lineKey(l) === key);
      if (idx >= 0) {
        next[idx] = { ...next[idx], quantity: Math.min(next[idx].quantity + line.quantity, 10) };
      } else {
        next.push(line);
      }
      persistCart(next);
    },
    [cart, persistCart],
  );

  const updateQuantity = useCallback(
    (line: Pick<CartLine, "product_id" | "size" | "color">, quantity: number) => {
      const key = lineKey(line);
      const next = cart
        .map((l) => (lineKey(l) === key ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0);
      persistCart(next);
    },
    [cart, persistCart],
  );

  const removeLine = useCallback(
    (line: Pick<CartLine, "product_id" | "size" | "color">) => {
      const key = lineKey(line);
      persistCart(cart.filter((l) => lineKey(l) !== key));
    },
    [cart, persistCart],
  );

  const clearCart = useCallback(() => persistCart([]), [persistCart]);

  const toggleWishlist = useCallback(
    (productId: string) => {
      const next = wishlist.includes(productId)
        ? wishlist.filter((id) => id !== productId)
        : [...wishlist, productId];
      setWishlist(next);
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    },
    [wishlist],
  );

  const inWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const value = useMemo<StoreState>(
    () => ({
      cart,
      cartCount: cart.reduce((sum, l) => sum + l.quantity, 0),
      wishlist,
      addToCart,
      updateQuantity,
      removeLine,
      clearCart,
      toggleWishlist,
      inWishlist,
    }),
    [cart, wishlist, addToCart, updateQuantity, removeLine, clearCart, toggleWishlist, inWishlist],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
