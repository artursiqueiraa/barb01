# PROJECT AUDIT — Fase 0 (Discovery)

Data: 2026-09-18

## 1. Estado encontrado

O diretório `C:\Users\STI- NTBK\Documents\barb` estava **completamente vazio** (sem arquivos, sem `.git`, sem `package.json`). Não existe nenhuma aplicação prévia para preservar, migrar ou refatorar.

Conclusão: este é um projeto **greenfield**. As seções do prompt mestre relativas a "preservar o que funciona" e "não quebrar funcionalidades existentes" não se aplicam ao estado inicial, mas passam a valer a partir do primeiro commit — todo código escrito a partir daqui é "existente" para efeitos de mudanças futuras.

## 2. Ferramental disponível na máquina

Verificado via shell antes de decidir a stack:

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | v24.15.0 | OK para Next.js 15 |
| npm | 12.0.1 | gerenciador de pacotes padrão |
| Git | 2.55.0 (Windows) | repositório inicializado (`git init`) |
| Docker | 29.6.2 | **usado para rodar PostgreSQL localmente** via `docker-compose.yml` |
| psql / Postgres nativo | ausente | não instalado no host — por isso Postgres roda em container |

Decisão registrada: como não há Postgres instalado nativamente, o ambiente de desenvolvimento local sobe o banco via Docker Compose (serviço `db`, imagem `postgres:16-alpine`), evitando SQLite (que não suporta bem `Decimal`/`Enum` do jeito que o domínio financeiro exige) e evitando depender de um serviço cloud só para rodar localmente.

## 3. Stack escolhida

Conforme preferência do documento mestre, e sem nenhum código legado que justifique divergir:

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Estilo**: Tailwind CSS
- **Formulários**: React Hook Form + Zod (schemas compartilhados entre client e server)
- **Backend**: Route Handlers do Next.js (`app/api/**`) + Server Actions para mutações internas do painel admin
- **Banco**: PostgreSQL 16
- **ORM**: Prisma
- **Autenticação**: Auth.js (NextAuth v5) com Credentials Provider (email/senha com hash Argon2) — extensível a OAuth depois
- **Deploy**: Vercel (app) + Postgres gerenciado (Neon/Supabase/RDS — a definir no deploy, documentado em `DEPLOYMENT.md`)
- **Testes**: Vitest (unit/integração de regras de negócio) + Playwright (E2E), conforme Etapa 9 do roadmap

## 4. Funcionalidades existentes

Nenhuma. Todas as 20 funcionalidades listadas no prompt mestre serão implementadas do zero, seguindo o roadmap de 10 etapas (seção 50 do prompt mestre / `IMPLEMENTATION-PLAN.md`).

## 5. Riscos identificados antecipadamente

1. **Dinheiro em ponto flutuante** — mitigado desde o schema: todos os campos monetários usam `Decimal(10,2)` no Prisma/Postgres, nunca `Float`.
2. **Comissão recalculada retroativamente** — mitigado por design: `Attendance` grava snapshot (`commission_percentage`, `commission_value`, `price_reference`) no momento do atendimento; nunca deriva de `CommissionRule` atual em relatórios históricos.
3. **Autorização só no frontend** — mitigado por middleware + verificação server-side em cada Route Handler/Server Action (nunca confiar em `role` vindo do client).
4. **Acoplamento a um gateway de pagamento específico** — mitigado por uma interface `PaymentProvider` (`lib/payments/provider.ts`) implementada por um adapter concreto (ex.: Stripe/Mercado Pago) escolhido apenas na Etapa 5.
5. **Duplicidade de webhook** — mitigado com tabela de idempotência (`external_payment_id` único + verificação antes de processar).
6. **Concorrência em agendamento** — mitigado com constraint de unicidade `(barber_id, scheduled_date, start_time)` no banco, não só validação em memória.
7. **Escopo muito grande para uma única sessão** — mitigado seguindo estritamente o roadmap por etapas (seção 50), entregando MVP funcional por etapa em vez de tentar tudo de uma vez.

## 6. Código reutilizável / a refatorar

Não aplicável (projeto novo).

## 7. Recomendação

Prosseguir imediatamente para:
1. `docs/IMPLEMENTATION-PLAN.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DATABASE.md`
4. `docs/DIAGRAMS.md`

Nenhuma decisão bloqueante foi encontrada que exija validação do usuário antes de prosseguir (Docker cobre a lacuna de Postgres local; gateway de pagamento fica abstraído por interface, adiando a escolha do provedor concreto para a Etapa 5 sem bloquear o restante). Implementação prossegue de forma autônoma, conforme seção 54 do prompt mestre.
