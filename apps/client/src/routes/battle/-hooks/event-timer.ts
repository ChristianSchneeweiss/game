import { useEffect } from "react";

import { useState } from "react";

export const useEventTimer = (
  currentEventCounter: number,
  allEvents: number,
  roundTime: number,
) => {
  const [visibleEvents, setVisibleEvents] = useState(currentEventCounter);

  useEffect(() => {
    if (visibleEvents < allEvents) {
      const timer = setTimeout(() => {
        setVisibleEvents((prev) => prev + 1);
      }, roundTime);
      return () => clearTimeout(timer);
    }
  }, [visibleEvents, allEvents, currentEventCounter]);

  return { visibleEvents };
};
