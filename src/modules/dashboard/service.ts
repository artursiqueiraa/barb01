import { prisma } from "@/lib/db/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export const dashboardService = {
  async getSummary() {
    const today = startOfToday();
    const monthStart = startOfMonth();

    const [
      totalCustomers,
      activeSubscriptions,
      attendancesToday,
      attendancesMonth,
      newSubscriptionsMonth,
      cancelledSubscriptionsMonth,
      commissionsAgg,
      revenueAgg,
    ] = await Promise.all([
      prisma.customer.count({ where: { active: true } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.attendance.count({ where: { createdAt: { gte: today } } }),
      prisma.attendance.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.subscription.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.subscription.count({
        where: { status: "CANCELLED", cancelledAt: { gte: monthStart } },
      }),
      prisma.attendance.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { commissionValue: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCustomers,
      activeSubscriptions,
      attendancesToday,
      attendancesMonth,
      newSubscriptionsMonth,
      cancelledSubscriptionsMonth,
      commissionsMonth: Number(commissionsAgg._sum.commissionValue ?? 0),
      revenueMonth: Number(revenueAgg._sum.amount ?? 0),
    };
  },
};
