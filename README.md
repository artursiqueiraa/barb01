# Barbearia — Sistema de Gestão

Sistema completo de gestão para barbearia: site público, assinaturas, agendamento, controle de
clientes/barbeiros/serviços, atendimentos com comissão automática, relatórios, dashboard e RBAC.

Veja o contexto completo de produto e arquitetura em [`docs/`](docs/):

- [`docs/PROJECT-AUDIT.md`](docs/PROJECT-AUDIT.md) — discovery inicial
- [`docs/IMPLEMENTATION-PLAN.md`](docs/IMPLEMENTATION-PLAN.md) — roadmap por etapas
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura e estrutura de pastas
- [`docs/DATABASE.md`](docs/DATABASE.md) — modelo de dados
- [`docs/DIAGRAMS.md`](docs/DIAGRAMS.md) — diagramas (ERD, fluxos, RBAC)

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Auth.js (Credentials) ·
Zod · React Hook Form · Vitest.

## Rodando localmente

Pré-requisitos: Node.js 20+, Docker (para o Postgres local).

```bash
# 1. instalar dependências
npm install

# 2. copiar variáveis de ambiente
cp .env.example .env
# gere um AUTH_SECRET novo se for além de teste local:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. subir o Postgres local (porta 5433, ver docker-compose.yml)
docker compose up -d

# 4. aplicar migrations
npm run db:migrate

# 5. popular dados iniciais (admin, barbeiro exemplo, serviços, planos)
npm run db:seed

# 6. rodar o servidor de desenvolvimento
npm run dev
```

Acesse http://localhost:3000 (site público) e http://localhost:3000/login (painel).

Credenciais criadas pela seed:

| Papel    | E-mail                    | Senha         |
|----------|---------------------------|---------------|
| ADMIN    | admin@barbearia.com       | Admin@123     |
| BARBEIRO | carlos@barbearia.com      | Barbeiro@123  |

> A porta do Postgres local é `5433` (não `5432`) para não colidir com outros containers Postgres
> que já possam estar rodando na máquina. Ajuste `docker-compose.yml`/`.env` se precisar de outra porta.

## Scripts

| Comando            | Descrição                                   |
|---------------------|----------------------------------------------|
| `npm run dev`       | servidor de desenvolvimento                  |
| `npm run build`     | build de produção                            |
| `npm run start`     | roda o build de produção                     |
| `npm run lint`      | ESLint                                       |
| `npm run test`      | testes unitários (Vitest)                    |
| `npm run db:migrate`| aplica migrations do Prisma                  |
| `npm run db:seed`   | popula dados iniciais                        |
| `npm run db:studio` | abre o Prisma Studio                         |

## Estado atual

Etapas 1–4 do roadmap (fundação, cadastros, operação/comissão, dashboard/relatórios) implementadas
e testadas. Assinaturas/pagamentos (Etapa 5), agendamento (Etapa 6) e integração WhatsApp completa
(Etapa 7) têm o modelo de dados pronto mas a lógica de negócio ainda está em desenvolvimento — ver
`docs/IMPLEMENTATION-PLAN.md` para o detalhamento e critério de aceite do MVP.
