import { cn } from "@/lib/utils";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

type Affinity = "fire" | "water" | "earth" | "lightning" | "dark";

const affinityClassMap: Record<Affinity, string> = {
  fire: "border-[#ff6a2a]/40 bg-[#ff6a2a]/12 text-[#ff9a6d]",
  water: "border-(--rpg-line) bg-(--rpg-bg-1) text-[#81c7ff]",
  earth: "border-[#5c8f3a]/40 bg-[#5c8f3a]/12 text-[#a4cf79]",
  lightning: "border-[#e8d24a]/40 bg-[#e8d24a]/12 text-[#f7ec94]",
  dark: "border-(--rpg-line) bg-(--rpg-bg-1) text-[#b690e0]",
};

export function getAffinityBadgeClass(affinity: Affinity) {
  return affinityClassMap[affinity];
}

export function RpgPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main id="main-content" tabIndex={-1} className={cn("rpg-page", className)}>
      <div className="rpg-shell">{children}</div>
    </main>
  );
}

export function RpgPanel({
  children,
  className,
  contentClassName,
  ...props
}: React.ComponentProps<"section"> & {
  contentClassName?: string;
}) {
  return (
    <section className={cn("rpg-panel", className)} {...props}>
      <div className={cn("rpg-panel-content", contentClassName)}>
        {children}
      </div>
    </section>
  );
}

export function RpgInset({
  children,
  className,
  variant = "parchment",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "parchment" | "stone";
}) {
  return (
    <div
      className={cn(
        variant === "parchment" ? "rpg-parchment" : "rpg-stone",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RpgSectionHeading({
  icon,
  eyebrow,
  title,
  className,
  titleClassName,
}: {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="rpg-icon-frame h-11 w-11 shrink-0">{icon}</div>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="rpg-title text-xs text-(--rpg-text-faint)">{eyebrow}</p>
        ) : null}
        <h2
          className={cn(
            "rpg-heading mt-1 text-2xl leading-none font-semibold tracking-[0.03em]",
            titleClassName,
          )}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

export function RpgHero({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <RpgPanel className={cn("px-6 py-6 sm:px-8 sm:py-8", className)}>
      <div
        className={cn(
          "grid gap-6",
          aside && "xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end",
        )}
      >
        <div className="max-w-3xl">
          <div className="rpg-badge">{eyebrow}</div>
          <h1 className="rpg-heading mt-4 text-3xl leading-tight font-medium sm:text-4xl">
            {title}
          </h1>
          <p className="rpg-copy mt-5 max-w-2xl text-base leading-8 sm:text-lg">
            {description}
          </p>
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </RpgPanel>
  );
}

export function RpgStatTile({
  label,
  value,
  icon,
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("rpg-stat-tile", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-(--rpg-text-faint) uppercase">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold text-(--rpg-text-main)",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function RpgBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rpg-badge", className)}>{children}</div>;
}

export function RpgAffinityBadge({
  affinity,
  children,
  className,
}: {
  affinity: Affinity;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase",
        getAffinityBadgeClass(affinity),
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RpgEmptyState({
  icon,
  title,
  copy,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rpg-empty-state", className)}>
      <div aria-hidden="true" className="rpg-empty-icon">
        {icon}
      </div>
      <h3 className="rpg-heading mt-5 text-3xl leading-none font-semibold tracking-[0.05em]">
        {title}
      </h3>
      <p className="rpg-copy mx-auto mt-4 max-w-xl text-base leading-7">
        {copy}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function RpgMeter({
  label,
  value,
  max,
  tone,
  delta,
  className,
}: {
  label: string;
  value: number;
  max: number;
  tone: "health" | "mana" | "xp";
  delta?: number;
  className?: string;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <div className={cn(className)}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-(--rpg-text-faint)">
          <span className="rpg-title text-xs">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-(--rpg-text-main)">
            {value}/{max}
          </span>
          {delta !== undefined && delta !== 0 ? (
            <span
              className={cn(
                "rounded-sm border px-2 py-0.5 text-xs font-semibold",
                delta > 0
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-red-400/30 bg-red-500/10 text-red-200",
              )}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          ) : null}
        </div>
      </div>
      <div
        className="rpg-meter"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(1, max)}
        aria-valuenow={Math.max(0, Math.min(value, Math.max(1, max)))}
        aria-valuetext={`${value} / ${max}`}
      >
        <div
          className="rpg-meter-fill"
          data-tone={tone}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function RpgBackLink(
  props: Omit<LinkProps, "children"> & {
    children: React.ReactNode;
    className?: string;
  },
) {
  const { className, children, ...linkProps } = props;

  return (
    <Link {...linkProps} className={cn("rpg-link rpg-back-link", className)}>
      <ChevronLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
