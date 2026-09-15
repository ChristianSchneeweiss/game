import { useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import "@/styles/inventory.css";

type InventoryEntry = {
  id: string;
  title: string;
  icon: ReactNode;
  metadata: ReactNode;
  trailing: ReactNode;
  label?: string;
};

export function InventoryBrowser({
  entries,
  selectedId,
  onSelect,
  label,
  detailLabel,
  description,
  children,
}: {
  entries: InventoryEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  detailLabel: string;
  description: string;
  children: ReactNode;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  const isMobile = useIsMobile();
  const selected = entries.find((entry) => entry.id === selectedId);

  return (
    <Dialog open={isMobile && detailOpen} onOpenChange={setDetailOpen}>
      <div className="inventory-layout">
        <div className="inventory-index" aria-label={label}>
          {entries.map((entry) => {
            const row = (
              <button
                type="button"
                className="inventory-row"
                aria-label={entry.label ?? `Inspect ${entry.title}`}
                aria-pressed={entry.id === selectedId}
                onClick={(event) => {
                  onSelect(entry.id);
                  selectedButton.current = event.currentTarget;
                }}
              >
                {entry.icon}
                <span className="inventory-row-copy">
                  <strong>{entry.title}</strong>
                  <span>{entry.metadata}</span>
                </span>
                {entry.trailing}
              </button>
            );
            return isMobile ? (
              <DialogTrigger key={entry.id} asChild>
                {row}
              </DialogTrigger>
            ) : (
              <div key={entry.id}>{row}</div>
            );
          })}
        </div>
        {!isMobile && (
          <aside className="inventory-reading" aria-label={detailLabel}>
            {children}
          </aside>
        )}
      </div>
      {isMobile && (
        <DialogContent
          className="inventory-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            selectedButton.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">{selected?.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
          {children}
        </DialogContent>
      )}
    </Dialog>
  );
}
