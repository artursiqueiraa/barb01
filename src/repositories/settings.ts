import { prisma } from "@/lib/db/prisma";

export const settingsRepository = {
  get() {
    return prisma.businessSetting.findUnique({ where: { id: "default" } });
  },
};
