import { cache } from "react";
import { eventRepository } from "../../../../repositories";

export const getEventForDetail = cache(
  async (id: string) => {
    return eventRepository.findById(id).catch(() => null);
  },
);
