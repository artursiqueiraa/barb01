import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { registerCustomerSchema } from "@/schemas/auth";

export const authService = {
  async registerCustomer(input: unknown) {
    const data = registerCustomerSchema.parse(input);

    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email } }),
      prisma.customer.findUnique({ where: { cpf: data.cpf } }),
    ]);

    if (existingEmail) throw new DomainError("Já existe uma conta com este e-mail");
    if (existingCpf) throw new DomainError("Já existe um cliente cadastrado com este CPF");

    const passwordHash = await hashPassword(data.password);

    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { name: data.name, cpf: data.cpf, phone: data.phone },
      });

      await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: "CLIENTE",
          customerId: customer.id,
        },
      });

      return customer;
    });
  },
};
