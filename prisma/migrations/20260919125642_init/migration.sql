-- AlterTable
ALTER TABLE "business_settings" ALTER COLUMN "whatsappMessageTemplate" SET DEFAULT 'Olá, {{customerName}}! Seu atendimento foi solicitado.
Serviço: {{serviceName}}
Barbeiro: {{barberName}}
Data: {{date}}
Horário: {{time}}';
