import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import "@/styles/collections.css";

export function CollectionHeader({
  eyebrow,
  title,
  description,
  summary,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  summary: { label: string; value: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <header className="collection-header">
      <div>
        <p className="rpg-title collection-eyebrow">
          <BookOpen size={16} />
          {eyebrow}
        </p>
        <h1 className="rpg-heading">{title}</h1>
        <p className="rpg-copy">{description}</p>
      </div>
      <div className="collection-header-aside">
        <dl className="collection-totals">
          {summary.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {actions}
      </div>
    </header>
  );
}

export function CollectionEntry({
  title,
  icon,
  badge,
  description,
  facts,
  footer,
}: {
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  description: string;
  facts?: { label: string; value: ReactNode }[];
  footer?: ReactNode;
}) {
  return (
    <article className="collection-entry">
      <header>
        {icon}
        <h3>{title}</h3>
        {badge}
      </header>
      <p className="collection-description">{description}</p>
      {facts && (
        <dl className="collection-facts">
          {facts.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <footer>{footer}</footer>}
    </article>
  );
}

export function CollectionLoading() {
  return (
    <p className="collection-loading" role="status">
      Opening your collection…
    </p>
  );
}
