import { useUser } from "@clerk/clerk-react";
import { AiControlForm } from "@/components/ai-control-form";
import type { BattleSession } from "../-hooks/use-battle";
import { Flag, Hand } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function BattleAiControls({ session }: { session: BattleSession }) {
  const { user } = useUser();
  const ai = session.battleState?.ai;
  if (!user || !ai || session.winner || session.abandoned) return null;
  const owned = ai.controls.flatMap((control) => {
    if (!control.settings) return [];
    const entity = session.participants.find(
      (entity) =>
        entity.id === control.entityId &&
        "userId" in entity &&
        entity.userId === user.id,
    );
    return entity
      ? [{ ...control, settings: control.settings, entity }]
      : [];
  });
  if (!owned.length) return null;
  const enabled = owned.filter((control) => control.enabled).length;
  const active = owned.find(
    (control) =>
      control.entity.id === session.activeEntity?.id && control.enabled,
  );
  return (
    <div className="battle-ai-toolbar" aria-label="Battle Commander controls">
      <Dialog key={user.id}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="rpg-badge battle-ai-trigger"
            data-enabled={enabled > 0 || undefined}
          >
            <Flag size={15} aria-hidden="true" />
            Commander
            {enabled > 0 && (
              <span
                className="battle-ai-count"
                aria-label={`${enabled} enabled`}
              >
                {enabled}
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="battle-ai-dialog">
          <div className="ai-dialog-heading">
            <span className="ai-dialog-eyebrow">Your party</span>
            <DialogTitle>Commander</DialogTitle>
            <DialogDescription>
              Choose who to command yourself and who to delegate.
            </DialogDescription>
          </div>
          <div className="ai-party-settings">
            {owned.map((control) => (
              <div key={control.entity.id}>
                <AiControlForm
                  label={control.entity.name}
                  settings={control.settings}
                  disabled={!session.ai.canEdit}
                  onSave={(next) =>
                    session.ai.setControl(control.entity.id, next)
                  }
                />
                {control.failure && (
                  <p className="ai-control-notice" role="alert">
                    {control.failure}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="ai-dialog-footnote">
            Your commander can finish this battle while you're away. Take over
            at any time.
          </p>
        </DialogContent>
      </Dialog>
      {active && (
        <button
          type="button"
          className="rpg-badge battle-ai-takeover"
          disabled={!session.ai.canEdit}
          title={`Take control of ${active.entity.name}`}
          onClick={() =>
            session.ai.setControl(active.entity.id, {
              ...active.settings,
              enabled: false,
            })
          }
        >
          <Hand size={14} aria-hidden="true" /> Take over
        </button>
      )}
      {owned
        .filter((control) => control.failure)
        .map((control) => (
          <p className="ai-control-notice" role="alert" key={control.entity.id}>
            {control.entity.name}: {control.failure}
          </p>
        ))}
      {session.ai.error && (
        <p className="ai-control-notice" role="alert">
          {session.ai.error}
        </p>
      )}
    </div>
  );
}
