# PLANO DE IMPLEMENTAÇÃO

Baseado no roadmap da seção 50 do prompt mestre. Cada etapa só começa quando a anterior está funcional (build passando, sem regressão). Critérios de aceite do MVP (seção 51) são o gate final.

## ETAPA 1 — Fundação
- Scaffold Next.js 15 (App Router, TS strict, Tailwind, ESLint, Prettier)
- `docker-compose.yml` com Postgres 16
- Prisma inicializado + schema completo (todas as entidades da seção 33) + migration inicial
- Auth.js (Credentials + Argon2), sessão JWT com `role`
- Middleware de proteção de rotas `/admin/**`
- Estrutura de pastas modular (seção 5/35)
- Logger estruturado básico (`lib/logger`)
- `.env.example`, README inicial

## ETAPA 2 — Cadastros
- CRUD Serviços (`services`)
- CRUD Barbeiros (`barbers`) + regras de comissão (`commission_rules`)
- CRUD Planos (`plans`)
- CRUD Clientes (`customers`)
- Schemas Zod para cada entidade
- Soft delete (`active` + `deleted_at`) em todas

## ETAPA 3 — Operação
- Registro de atendimento (`attendances`) com snapshot de comissão
- Fluxo recepção: buscar cliente → serviço → barbeiro → confirmar
- Histórico do cliente (`/admin/clientes/[id]`)
- Histórico do barbeiro (`/admin/barbeiros/[id]`)

## ETAPA 4 — Dashboard e Relatórios
- `/admin/dashboard` com cards (seção 23)
- `/admin/relatorios`: produção, serviços, clientes, comissão, assinaturas, financeiro
- Exportação CSV

## ETAPA 5 — Assinaturas e Pagamentos ✅ concluída
- `PaymentProvider` (interface + `ManualPaymentProvider` funcional; adapter real plugável depois — decisão documentada em `docs/PAYMENTS.md`)
- `subscriptions`, `payments`, `subscription_status_history` (histórico de toda mudança de status), `payment_events` (idempotência de webhook)
- Checkout (cliente escolhe plano → `Subscription` PENDING com snapshot do preço) em `/perfil/assinatura`
- Confirmação manual de pagamento pelo admin/gerente em `/admin/assinaturas` (com filtros por status/plano/período)
- Webhook `/api/webhooks/payment` com verificação de assinatura HMAC e idempotência — testado ponta a ponta (assinatura inválida → 401, evento duplicado não duplica `Payment`)
- Regras de transição de status (`lib/subscriptions/transitions.ts`, testado): PENDING→ACTIVE/CANCELLED/EXPIRED, ACTIVE→PAST_DUE/CANCELLED/EXPIRED, PAST_DUE→ACTIVE/CANCELLED/EXPIRED; CANCELLED/EXPIRED terminais
- Atendimento reconhece assinatura ativa → `payment_type = SUBSCRIPTION` (só `ACTIVE` libera benefício, `PAST_DUE` não)
- Cancelamento nunca deleta — só marca `CANCELLED` + `cancelledAt`, preserva histórico

## ETAPA 6 — Agendamento
- `appointments` CRUD (schema já existe)
- Regras: sem conflito de horário por barbeiro (constraint `@@unique([barberId, startAt])` já existe), barbeiro/serviço ativos, horário dentro do funcionamento
- `business_settings.openingHours` por dia da semana (já existe como Json — falta UI de edição e validação de agendamento contra ele)
- `barber_schedule_blocks` (folgas/bloqueios) — a criar
- Conclusão do atendimento (`Appointment.status = COMPLETED`) só acontece quando a recepção efetivamente registra o `Attendance` — agendamento nunca gera produção sozinho
- NO_SHOW não cria atendimento automaticamente
- Tela cliente (`/perfil/agendamentos`: agendar/cancelar), tela barbeiro (própria agenda) e tela recepção (dia/semana/mês)

## ETAPA 7 — WhatsApp
- `WhatsAppService` (`lib/whatsapp/service.ts` já existe: `buildWhatsAppLink` + `renderTemplate`) — falta a biblioteca de templates (`appointment_created`, `appointment_confirmed`, etc.) e integrar nos fluxos de agendamento/atendimento
- Modal de captação de lead no site público
- Número sempre vindo de `business_settings`, nunca hardcode (já é assim no CTA da home)

## ETAPA 8 — Financeiro
- Separar receita real (soma de `Payment.status=PAID`) de valor de referência (soma de `Attendance.priceReference`) — já implementado em `reportsService.financialSummary`, mas precisa de tela dedicada deixando essa distinção explícita
- `commission_closings` (fechamento de comissão por barbeiro/período, status OPEN/CLOSED/PAID) — a criar
- Ajustes de comissão pós-fechamento (nunca editar `Attendance` histórico) — a criar
- Exportação CSV dos relatórios

## ETAPA 9 — Segurança e QA
- Auditoria de IDOR em todas as rotas com `:id` (cliente/barbeiro tentando acessar dado de outro)
- Rate limiting em login, cadastro, checkout, webhook
- Expandir testes: integração dos fluxos E2E principais (assinatura, agendamento, atendimento, RBAC)
- Revisão de todas as actions/endpoints contra a matriz RBAC

## ETAPA 10 — Produção
- `docs/DEPLOYMENT.md` (já criado — revisar antes do primeiro deploy real)
- Configuração Vercel + Postgres gerenciado
- Variáveis de ambiente de produção, `prisma migrate deploy` no pipeline
- Backups, observabilidade

## Critério de aceite do MVP
Ver checklist completo na seção 51 do prompt mestre — replicado em `docs/PRODUCT.md` para acompanhamento.

## Observação sobre execução
Cada etapa entrega ao final: lista de implementado, arquivos criados/modificados, resultado de testes/build, problemas encontrados, próxima etapa — conforme seção 57.
