# DEPLOYMENT

## Ambiente local

Ver `README.md` (passo a passo completo). Resumo:

```bash
docker compose up -d      # Postgres local, porta 5433
npm run db:migrate
npm run db:seed
npm run dev
```

O Postgres local roda na porta **5433** (não 5432) porque a máquina de desenvolvimento já tinha
outro container Postgres de outro projeto ocupando a porta padrão — ver `docker-compose.yml`.
Em outro ambiente sem esse conflito, `5432:5432` funciona normalmente.

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias em qualquer ambiente:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | string de conexão PostgreSQL |
| `AUTH_SECRET` | segredo do Auth.js (gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
| `NEXTAUTH_URL` | URL pública da aplicação |
| `PAYMENT_PROVIDER` / `PAYMENT_WEBHOOK_SECRET` | usados a partir da Etapa 5 |
| `WHATSAPP_BUSINESS_PHONE` | número usado nos links `wa.me` |

## Produção (Vercel)

1. Provisionar um Postgres gerenciado (Neon, Supabase, RDS, etc.) e configurar `DATABASE_URL`.
2. Configurar as variáveis de ambiente acima no projeto Vercel.
3. Build command padrão do Next.js já roda `prisma generate` (via `postinstall` implícito do
   pacote `@prisma/client`); adicionar `prisma migrate deploy` a um passo de release antes do
   deploy (ex.: comando de build customizado `prisma migrate deploy && next build`) para aplicar
   migrations pendentes sem interação.
4. Deploy via `git push` para o branch conectado ao projeto Vercel.

## Backups

Responsabilidade do provedor de Postgres gerenciado escolhido em produção (snapshots automáticos).
Em desenvolvimento local, o volume Docker `barb_barb_pgdata` persiste os dados entre reinícios do
container; `docker compose down -v` apaga esse volume — usar com cuidado.

## Observabilidade

`lib/logger` emite JSON estruturado para stdout/stderr — compatível com qualquer coletor de logs
que a plataforma de deploy já forneça (ex.: Vercel Logs). Nenhuma dependência externa adicional
necessária para o MVP.
