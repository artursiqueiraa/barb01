import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  await prisma.businessSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Barbearia Exemplo",
      phone: "5599999999999",
      whatsapp: "5599999999999",
      instagram: "@barbeariaexemplo",
      address: "Rua Exemplo, 123 - Centro",
      openingHours: {
        seg: "09:00-20:00",
        ter: "09:00-20:00",
        qua: "09:00-20:00",
        qui: "09:00-20:00",
        sex: "09:00-20:00",
        sab: "09:00-18:00",
        dom: "fechado",
      },
    },
  });

  const adminPasswordHash = await hash("Admin@123", { algorithm: 2 });
  await prisma.user.upsert({
    where: { email: "admin@barbearia.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@barbearia.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const services = [
    { name: "Corte Masculino", price: 40, durationMinutes: 30 },
    { name: "Barba", price: 40, durationMinutes: 30 },
    { name: "Sobrancelha", price: 15, durationMinutes: 15 },
    { name: "Hidratação", price: 25, durationMinutes: 20 },
    { name: "Limpeza de Pele", price: 35, durationMinutes: 30 },
    { name: "Selagem", price: 90, durationMinutes: 60 },
  ];

  const createdServices: Record<string, string> = {};
  for (const service of services) {
    const created = await prisma.service.upsert({
      where: { id: service.name },
      update: { price: service.price, durationMinutes: service.durationMinutes },
      create: { id: service.name, ...service },
    });
    createdServices[service.name] = created.id;
  }

  const plans = [
    { name: "Corte Ilimitado", price: 69.9 },
    { name: "Barba", price: 78.9 },
    { name: "Corte + Barba", price: 138.9 },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.name },
      update: { price: plan.price },
      create: { id: plan.name, ...plan, description: plan.name },
    });
  }

  const barberPasswordHash = await hash("Barbeiro@123", { algorithm: 2 });
  const barber = await prisma.barber.upsert({
    where: { id: "carlos-seed" },
    update: {},
    create: {
      id: "carlos-seed",
      name: "Carlos",
      phone: "5599888888888",
      defaultCommissionPercentage: 50,
    },
  });

  await prisma.user.upsert({
    where: { email: "carlos@barbearia.com" },
    update: {},
    create: {
      name: "Carlos",
      email: "carlos@barbearia.com",
      passwordHash: barberPasswordHash,
      role: "BARBEIRO",
      barberId: barber.id,
    },
  });

  await prisma.commissionRule.upsert({
    where: { barberId_serviceId: { barberId: barber.id, serviceId: createdServices["Sobrancelha"] } },
    update: { percentage: 40 },
    create: { barberId: barber.id, serviceId: createdServices["Sobrancelha"], percentage: 40 },
  });

  console.log("Seed concluído.");
  console.log("Login ADMIN: admin@barbearia.com / Admin@123");
  console.log("Login BARBEIRO: carlos@barbearia.com / Barbeiro@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
