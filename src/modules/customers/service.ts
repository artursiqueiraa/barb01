import { DomainError, NotFoundError } from "@/lib/errors";
import { customersRepository } from "@/repositories/customers";
import { customerSchema } from "@/schemas/customer";

export const customersService = {
  list(params: { search?: string } = {}) {
    return customersRepository.findMany(params);
  },

  async getById(id: string) {
    const customer = await customersRepository.findById(id);
    if (!customer) throw new NotFoundError("Cliente");
    return customer;
  },

  async create(input: unknown) {
    const data = customerSchema.parse(input);
    const existing = await customersRepository.findByCpf(data.cpf);
    if (existing) throw new DomainError("Já existe um cliente cadastrado com este CPF");
    return customersRepository.create(data);
  },

  async update(id: string, input: unknown) {
    const data = customerSchema.parse(input);
    const existing = await customersRepository.findByCpf(data.cpf);
    if (existing && existing.id !== id) {
      throw new DomainError("Já existe um cliente cadastrado com este CPF");
    }
    return customersRepository.update(id, data);
  },

  deactivate(id: string) {
    return customersRepository.softDelete(id);
  },

  history(id: string) {
    return customersRepository.historySummary(id);
  },

  async getProfile(id: string) {
    const customer = await customersRepository.findById(id);
    if (!customer) throw new NotFoundError("Cliente");

    const [attendances, subscription] = await Promise.all([
      customersRepository.historySummary(id),
      customersRepository.latestSubscription(id),
    ]);

    const nameHas = (needle: string) =>
      (name: string) => name.toLowerCase().includes(needle);

    return {
      customer,
      attendances,
      subscription,
      stats: {
        totalAttendances: attendances.length,
        lastAttendanceAt: attendances[0]?.createdAt ?? null,
        totalCortes: attendances.filter((a) => nameHas("corte")(a.service.name)).length,
        totalBarbas: attendances.filter((a) => nameHas("barba")(a.service.name)).length,
      },
    };
  },
};
