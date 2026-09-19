# PRODUTO

## Visão

Sistema de gestão para barbearia cobrindo site público, assinaturas recorrentes, agendamento,
cadastros, atendimentos com comissão automática, relatórios e controle financeiro básico — usado
pela recepção, pelos barbeiros, pelo administrador e pelos próprios clientes.

## Perfis de usuário e objetivo principal

| Papel | Usa o sistema para |
|---|---|
| ADMIN | configurar tudo: cadastros, comissões, planos, ver relatórios e financeiro completo |
| GERENTE | operação do dia a dia (clientes, barbeiros, serviços, planos, atendimentos, relatórios) sem mexer em configurações críticas |
| RECEPÇÃO | cadastrar cliente, registrar atendimento, agendar horário |
| BARBEIRO | registrar seu próprio atendimento, ver seu histórico e comissão |
| CLIENTE | assinar plano, agendar horário, ver seu histórico e pagamentos |

## MVP — critério de aceite

Replicado da seção 51 do documento mestre. Estado atual marcado.

- [x] Admin consegue fazer login
- [x] Admin consegue cadastrar barbeiro
- [x] Admin consegue definir comissão (padrão + por serviço)
- [x] Admin consegue cadastrar serviço
- [x] Admin consegue cadastrar plano
- [x] Admin consegue cadastrar cliente
- [x] Recepção consegue registrar atendimento
- [x] Sistema calcula comissão automaticamente
- [x] Sistema mantém snapshot da comissão (não recalcula histórico)
- [x] Cliente possui histórico (`/admin/clientes/[id]` e `/perfil`)
- [x] Barbeiro possui histórico (`/admin/barbeiros/[id]`)
- [x] Admin consegue visualizar produção (`/admin/relatorios`)
- [x] Admin consegue visualizar comissão (`/admin/relatorios`)
- [x] Admin consegue visualizar e gerenciar assinaturas (`/admin/assinaturas` — filtros, confirmar pagamento, cancelar)
- [x] Cliente consegue assinar um plano (`/perfil/assinatura` — checkout via `PaymentProvider` manual)
- [x] Sistema mantém snapshot do preço contratado da assinatura (não recalcula se o plano mudar)
- [x] Sistema mantém histórico de status da assinatura (`subscription_status_history`)
- [x] Webhook de pagamento idempotente e com verificação de assinatura (`/api/webhooks/payment`)
- [x] Regra de inadimplência: só `ACTIVE` libera benefício do plano
- [x] Dashboard funciona (`/admin/dashboard`)
- [x] Sistema possui RBAC (matriz em `lib/permissions/matrix.ts`, testada em `matrix.test.ts`)
- [x] Sistema possui validação (Zod em todos os formulários/actions)
- [x] Testes principais passam (`npm run test`)
- [x] Build de produção passa (`npm run build`)
- [x] Não existem erros críticos conhecidos

Pendente para MVP completo conforme roadmap (`docs/IMPLEMENTATION-PLAN.md`): gateway de pagamento
real plugado (hoje é manual — decisão em `docs/PAYMENTS.md`), tela de agenda com regras de conflito
(Etapa 6), integração ativa de WhatsApp em fluxos automáticos (Etapa 7), fechamento de comissão
(Etapa 8) e testes de segurança/IDOR expandidos (Etapa 9).

## Backlog pós-MVP

- Exportação CSV/PDF de relatórios (seção 45)
- Notificações automáticas (assinatura ativada, pagamento atrasado, lembrete de agendamento)
- Edição de configurações da barbearia pela interface (hoje somente leitura)
- Edição de cadastros existentes pela interface (hoje só criar/desativar)
- Regras avançadas de agenda: horário de almoço, folgas, feriados
