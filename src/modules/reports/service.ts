import { type AttendanceFilters, attendancesRepository } from "@/repositories/attendances";
import { type AuditLogFilters, auditLogsRepository } from "@/repositories/auditLogs";
import { barbersRepository } from "@/repositories/barbers";

interface DelayAuditMetadata {
  barberId?: string;
  barberName?: string;
  additionalMinutes?: number;
  affected?: unknown[];
}

export const reportsService = {
  async production(filters: AttendanceFilters = {}) {
    const [attendances, barbers] = await Promise.all([
      attendancesRepository.aggregateForReport(filters),
      barbersRepository.findMany({ onlyActive: false }),
    ]);

    return barbers.map((barber) => {
      const barberAttendances = attendances.filter((a) => a.barberId === barber.id);

      const byService = new Map<string, { count: number; commission: number }>();
      for (const attendance of barberAttendances) {
        const key = attendance.service.name;
        const current = byService.get(key) ?? { count: 0, commission: 0 };
        current.count += 1;
        current.commission += Number(attendance.commissionValue);
        byService.set(key, current);
      }

      return {
        barberId: barber.id,
        barberName: barber.name,
        totalAttendances: barberAttendances.length,
        totalCommission: barberAttendances.reduce((acc, a) => acc + Number(a.commissionValue), 0),
        byService: Array.from(byService.entries()).map(([serviceName, data]) => ({
          serviceName,
          ...data,
        })),
      };
    });
  },

  async byService(filters: AttendanceFilters = {}) {
    const attendances = await attendancesRepository.aggregateForReport(filters);
    const map = new Map<string, number>();
    for (const attendance of attendances) {
      map.set(attendance.service.name, (map.get(attendance.service.name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([serviceName, count]) => ({ serviceName, count }));
  },

  async financialSummary(filters: AttendanceFilters = {}) {
    const attendances = await attendancesRepository.aggregateForReport(filters);
    const revenue = attendances.reduce((acc, a) => acc + Number(a.priceReference), 0);
    const commissions = attendances.reduce((acc, a) => acc + Number(a.commissionValue), 0);
    return { revenue, commissions, balance: revenue - commissions };
  },

  /**
   * Relatório de atrasos (seção 14 do controle de atraso): reaproveita a
   * AuditLog existente (`action: "ATRASO_AGENDAMENTO"`), sem tabela dedicada.
   * Puramente informativo — nunca altera comissão.
   */
  async delays(filters: Omit<AuditLogFilters, "action" | "entity"> = {}) {
    const logs = await auditLogsRepository.findMany({ ...filters, action: "ATRASO_AGENDAMENTO", entity: "Appointment" });

    const byBarber = new Map<string, { barberName: string; count: number; totalMinutes: number; affectedCustomers: number }>();

    for (const log of logs) {
      const metadata = (log.metadata ?? {}) as DelayAuditMetadata;
      const barberId = metadata.barberId ?? "desconhecido";
      const current = byBarber.get(barberId) ?? {
        barberName: metadata.barberName ?? "Desconhecido",
        count: 0,
        totalMinutes: 0,
        affectedCustomers: 0,
      };
      current.count += 1;
      current.totalMinutes += metadata.additionalMinutes ?? 0;
      current.affectedCustomers += metadata.affected?.length ?? 0;
      byBarber.set(barberId, current);
    }

    return Array.from(byBarber.entries()).map(([barberId, data]) => ({
      barberId,
      barberName: data.barberName,
      count: data.count,
      totalMinutes: data.totalMinutes,
      averageMinutes: data.count > 0 ? Math.round(data.totalMinutes / data.count) : 0,
      affectedCustomers: data.affectedCustomers,
    }));
  },
};
