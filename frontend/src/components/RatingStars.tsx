import { Star } from "lucide-react";

// Small rating readout; renders nothing when there is no sample rating data.
export function RatingStars({
  rating,
  count,
  size = 12,
}: {
  rating: number | null;
  count?: number | null;
  size?: number;
}) {
  if (rating == null || rating <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${rating} out of 5`}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={
              i <= Math.round(rating) ? "fill-[#B8860B] text-[#B8860B]" : "fill-[#E8E2D9] text-[#E8E2D9]"
            }
          />
        ))}
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        {rating.toFixed(1)}
        {count != null ? ` (${count})` : ""}
      </span>
    </span>
  );
}
