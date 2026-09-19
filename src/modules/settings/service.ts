import { settingsRepository } from "@/repositories/settings";

export const settingsService = {
  get() {
    return settingsRepository.get();
  },
};
