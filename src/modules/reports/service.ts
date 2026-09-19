import { type AttendanceFilters, attendancesRepository } from "@/repositories/attendances";
import { barbersRepository } from "@/repositories/barbers";

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
};
