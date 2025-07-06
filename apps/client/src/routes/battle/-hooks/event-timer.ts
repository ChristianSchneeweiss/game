import { useEffect } from "react";

import type { TimelineEventFull } from "@loot-game/game/types";
import { useState } from "react";

export const useEventTimer = (
  timelineEvents: TimelineEventFull[],
  roundTime: number,
) => {
  const [visibleEvents, setVisibleEvents] = useState(0);

  useEffect(() => {
    if (visibleEvents < timelineEvents.length) {
      const timer = setTimeout(() => {
        setVisibleEvents((prev) => prev + 1);
      }, roundTime);
      return () => clearTimeout(timer);
    }
  }, [visibleEvents, timelineEvents.length]);

  return { visibleEvents };
};
