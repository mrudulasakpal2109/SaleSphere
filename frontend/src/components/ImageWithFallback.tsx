import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  eager?: boolean;
}

// Fashion image with a graceful branded fallback — a broken URL never shows a
// broken-image icon or an empty hole in the grid.
export function ImageWithFallback({ src, alt, className, eager, ...rest }: ImgProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex h-full w-full items-center justify-center bg-[#F3EFEA]",
          className,
        )}
      >
        <span className="font-heading text-lg tracking-[0.18em] text-[#B8AFa2] uppercase">Salesphere</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
}
