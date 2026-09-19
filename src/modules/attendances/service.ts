import { calculateCommissionValue } from "@/lib/commissions/calculate";
import { DomainError } from "@/lib/errors";
import { hasActiveBenefits } from "@/lib/subscriptions/transitions";
import { type AttendanceFilters, attendancesRepository } from "@/repositories/attendances";
import { barbersRepository, commissionRulesRepository } from "@/repositories/barbers";
import { customersRepository } from "@/repositories/customers";
import { servicesRepository } from "@/repositories/services";
import { attendanceSchema } from "@/schemas/attendance";

export const attendancesService = {
  list(filters: AttendanceFilters = {}) {
    return attendancesRepository.findMany(filters);
  },

  /**
   * Registra um atendimento calculando e gravando o snapshot de comissão
   * (priceReference, commissionPercentage, commissionValue). Esses valores
   * nunca são recalculados depois — ver seção 11 do documento de produto.
   */
  async register(input: unknown) {
    const data = attendanceSchema.parse(input);

    const [customer, barber, service] = await Promise.all([
      customersRepository.findById(data.customerId),
      barbersRepository.findById(data.barberId),
      servicesRepository.findById(data.serviceId),
    ]);

    if (!customer || !customer.active) throw new DomainError("Cliente inválido ou inativo");
    if (!barber || !barber.active) throw new DomainError("Barbeiro inválido ou inativo");
    if (!service || !service.active) throw new DomainError("Serviço inválido ou inativo");

    const activeSubscription = await customersRepository.latestSubscription(customer.id);
    const hasActiveSubscription = Boolean(activeSubscription && hasActiveBenefits(activeSubscription.status));

    const commissionPercentage = await commissionRulesRepository.resolvePercentage(barber.id, service.id);
    const priceReference = Number(service.price);
    const commissionValue = calculateCommissionValue(priceReference, commissionPercentage);

    return attendancesRepository.create({
      customer: { connect: { id: customer.id } },
      barber: { connect: { id: barber.id } },
      service: { connect: { id: service.id } },
      ...(hasActiveSubscription && activeSubscription
        ? { subscription: { connect: { id: activeSubscription.id } } }
        : {}),
      priceReference,
      commissionPercentage,
      commissionValue,
      paymentType: hasActiveSubscription ? "SUBSCRIPTION" : data.paymentType,
      notes: data.notes,
    });
  },
};
