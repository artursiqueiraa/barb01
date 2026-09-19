import { NotFoundError } from "@/lib/errors";
import { barbersRepository, commissionRulesRepository } from "@/repositories/barbers";
import { barberSchema, commissionRuleSchema } from "@/schemas/barber";

export const barbersService = {
  list() {
    return barbersRepository.findMany();
  },

  async getById(id: string) {
    const barber = await barbersRepository.findById(id);
    if (!barber) throw new NotFoundError("Barbeiro");
    return barber;
  },

  async create(input: unknown) {
    const data = barberSchema.parse(input);
    return barbersRepository.create(data);
  },

  async update(id: string, input: unknown) {
    const data = barberSchema.parse(input);
    return barbersRepository.update(id, data);
  },

  deactivate(id: string) {
    return barbersRepository.softDelete(id);
  },

  history(id: string) {
    return barbersRepository.historySummary(id);
  },

  async getProfile(id: string) {
    const barber = await this.getById(id);
    const attendances = await barbersRepository.historySummary(id);

    const nameHas = (needle: string) => (name: string) => name.toLowerCase().includes(needle);
    const totalCortes = attendances.filter((a) => nameHas("corte")(a.service.name)).length;
    const totalBarbas = attendances.filter((a) => nameHas("barba")(a.service.name)).length;

    return {
      barber,
      attendances,
      stats: {
        totalAttendances: attendances.length,
        totalCortes,
        totalBarbas,
        totalOutros: attendances.length - totalCortes - totalBarbas,
        totalPriceReference: attendances.reduce((acc, a) => acc + Number(a.priceReference), 0),
        totalCommission: attendances.reduce((acc, a) => acc + Number(a.commissionValue), 0),
      },
    };
  },

  async setCommissionRule(input: unknown) {
    const data = commissionRuleSchema.parse(input);
    return commissionRulesRepository.upsert(data.barberId, data.serviceId, data.percentage);
  },

  removeCommissionRule(id: string) {
    return commissionRulesRepository.deactivate(id);
  },
};
