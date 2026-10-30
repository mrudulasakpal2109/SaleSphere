import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function SectionHeading({
  overline,
  title,
  linkTo,
  linkLabel,
}: {
  overline: string;
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <p className="overline-label">{overline}</p>
        <h2 className="mt-2 font-heading text-3xl font-medium tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          data-testid={`section-link-${linkLabel.toLowerCase().replace(/\s/g, "-")}`}
          className="group inline-flex items-center gap-1.5 border-b border-foreground pb-0.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors hover:text-sale hover:border-sale"
        >
          {linkLabel}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </motion.div>
  );
}
