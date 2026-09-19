import { NotFoundError } from "@/lib/errors";
import { servicesRepository } from "@/repositories/services";
import { serviceSchema } from "@/schemas/service";

export const servicesService = {
  list() {
    return servicesRepository.findMany();
  },

  async getById(id: string) {
    const service = await servicesRepository.findById(id);
    if (!service) throw new NotFoundError("Serviço");
    return service;
  },

  async create(input: unknown) {
    const data = serviceSchema.parse(input);
    return servicesRepository.create(data);
  },

  async update(id: string, input: unknown) {
    const data = serviceSchema.parse(input);
    return servicesRepository.update(id, data);
  },

  deactivate(id: string) {
    return servicesRepository.softDelete(id);
  },
};
