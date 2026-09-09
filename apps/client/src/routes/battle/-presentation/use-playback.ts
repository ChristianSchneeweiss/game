import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { EffectTracking } from "@loot-game/game/bm";
import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import { buildTimeline, historyChange } from "./timeline";
import { miniature } from "./visual-manifest";

export function usePlayback(
  participants: Entity[],
  events: TimelineEventFull[],
  effects: EffectTracking,
  reset: number,
  replay = false,
  starts?: InBetweenCharacterData[],
) {
  const frames = useMemo(
    () => buildTimeline(participants, events, starts, effects),
    [participants, events, starts, effects],
  );
  const [position, setPosition] = useState({ cursor: 0, impact: false });
  const [historyRevision, setHistoryRevision] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(!replay);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const previous = useRef({ events, reset });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const change = historyChange(previous.current.events, events);
    if (
      previous.current.reset !== reset ||
      change === "replace" ||
      (!replay && events.length - position.cursor > 40)
    ) {
      setHistoryRevision((revision) => revision + 1);
      setPosition({ cursor: replay ? 0 : events.length, impact: false });
    }
    previous.current = { events, reset };
  }, [events, reset, replay, position.cursor]);

  useEffect(() => {
    if (replay) return;
    const catchUp = () => {
      if (document.visibilityState === "visible")
        setPosition({ cursor: events.length, impact: false });
    };
    document.addEventListener("visibilitychange", catchUp);
    return () => document.removeEventListener("visibilitychange", catchUp);
  }, [replay, events.length]);

  const cursor = Math.min(position.cursor, events.length);
  const next = frames[cursor + 1];
  useEffect(() => {
    if (!playing || !next) return;
    const ordinary =
      next.cue?.kind === "SPELL_CAST" || next.cue?.kind === "EFFECT_TRIGGER";
    const duration = reducedMotion ? 80 : ordinary ? 1000 : 160;
    const delay =
      (duration *
        (position.impact
          ? 1 - miniature.impactFraction
          : miniature.impactFraction)) /
      speed;
    const timer = window.setTimeout(
      () =>
        setPosition((p) =>
          p.impact
            ? { cursor: p.cursor + 1, impact: false }
            : { ...p, impact: true },
        ),
      delay,
    );
    return () => clearTimeout(timer);
  }, [playing, next, position.impact, speed, reducedMotion]);

  const seek = useCallback(
    (value: number) =>
      setPosition({
        cursor: Math.max(0, Math.min(events.length, value)),
        impact: false,
      }),
    [events.length],
  );
  const skip = useCallback(() => seek(events.length), [seek, events.length]);
  return {
    frames,
    stats: frames[cursor + (position.impact && next ? 1 : 0)].stats,
    cursor,
    caughtUp: cursor === events.length,
    cue: next?.cue,
    cueKey: `${reset}:${historyRevision}:${cursor}`,
    impact: position.impact,
    speed,
    setSpeed,
    reducedMotion,
    setReducedMotion,
    playing,
    setPlaying,
    skip,
    seek,
  };
}
