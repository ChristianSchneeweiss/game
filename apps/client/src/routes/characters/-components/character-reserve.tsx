import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/status";
import { CharacterSectionHeading } from "./character-ui";

export type ReserveItem = {
  id: string;
  title: string;
  description?: string;
  meta: string;
  icon: ReactNode;
};

export function CharacterReserve({
  title,
  items,
  loading,
  error,
  onRetry,
  pending,
  onEquip,
  emptyCopy,
  link,
}: {
  title: string;
  items: ReserveItem[];
  loading: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  pending: boolean;
  onEquip: (id: string, name: string) => Promise<void>;
  emptyCopy: string;
  link: { to: "/spells" | "/items" | "/loot"; label: string };
}) {
  return (
    <section className="character-build-panel character-reserve">
      <CharacterSectionHeading
        title={title}
        aside={
          !loading && !error ? (
            <span className="character-section-count">{items.length}</span>
          ) : undefined
        }
      >
        Unequipped items from your collection.
      </CharacterSectionHeading>
      {error ? (
        <Feedback error>
          Could not load this collection.{" "}
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </Feedback>
      ) : loading ? (
        <p className="character-inline-empty" role="status">
          Loading your collection…
        </p>
      ) : items.length === 0 ? (
        <p className="character-inline-empty">{emptyCopy}</p>
      ) : (
        <div className="character-reserve-list">
          {items.map((item) => (
            <article key={item.id} className="character-reserve-item">
              <div className="character-reserve-item-header">
                {item.icon}
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
              </div>
              {item.description && (
                <p className="character-reserve-description">
                  {item.description}
                </p>
              )}
              <Button
                variant="outline"
                disabled={pending}
                aria-label={`Equip ${item.title}`}
                onClick={() => void onEquip(item.id, item.title)}
              >
                <Plus size={14} aria-hidden="true" />
                Equip
              </Button>
            </article>
          ))}
        </div>
      )}
      <Link className="character-collection-link" to={link.to}>
        {link.label}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
