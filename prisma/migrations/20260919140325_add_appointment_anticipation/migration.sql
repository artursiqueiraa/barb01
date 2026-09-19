-- CreateEnum
CREATE TYPE "AnticipationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "appointments_barberId_startAt_key";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "anticipationRequestedStartAt" TIMESTAMP(3),
ADD COLUMN     "anticipationStatus" "AnticipationStatus";

-- CreateIndex (partial unique index)
-- Substitui a antiga @@unique([barberId, startAt]) por uma versão que só
-- vale entre agendamentos ATIVOS (PENDING/CONFIRMED). A constraint antiga
-- bloqueava reaproveitar o horário exato de um agendamento CANCELLED, o que
-- quebra a solicitação de antecipação (Etapa 6.1) no caso mais comum:
-- ocupar exatamente o horário liberado por um cancelamento. A camada de
-- aplicação (appointmentsService.create, applyDelay, acceptAnticipation) já
-- só valida conflito contra status ativos — este índice alinha o banco com
-- essa mesma regra, em vez de ser mais restritivo do que o necessário.
CREATE UNIQUE INDEX "appointments_barberId_startAt_active_key" ON "appointments"("barberId", "startAt") WHERE "status" IN ('PENDING', 'CONFIRMED');
