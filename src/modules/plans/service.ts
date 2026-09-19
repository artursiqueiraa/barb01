import { NotFoundError } from "@/lib/errors";
import { plansRepository } from "@/repositories/plans";
import { planSchema } from "@/schemas/plan";

export const plansService = {
  list() {
    return plansRepository.findMany();
  },

  async getById(id: string) {
    const plan = await plansRepository.findById(id);
    if (!plan) throw new NotFoundError("Plano");
    return plan;
  },

  async create(input: unknown) {
    const data = planSchema.parse(input);
    return plansRepository.create(data);
  },

  async update(id: string, input: unknown) {
    const data = planSchema.parse(input);
    return plansRepository.update(id, data);
  },

  deactivate(id: string) {
    return plansRepository.softDelete(id);
  },
};
