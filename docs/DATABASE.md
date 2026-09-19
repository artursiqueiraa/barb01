# MODELO DE BANCO DE DADOS

PostgreSQL 16 + Prisma. Este documento é a fonte de verdade textual; `prisma/schema.prisma` deve sempre refletir exatamente o que está aqui.

Convenções gerais:
- Todo dinheiro é `Decimal(10,2)` — nunca `Float`.
- Toda entidade de cadastro "mestre" (Customer, Barber, Service, Plan) usa **soft delete**: `active boolean default true` + `deletedAt DateTime?`. Nunca deletar fisicamente um registro que tenha histórico financeiro associado.
- Toda tabela tem `createdAt`/`updatedAt` (exceto tabelas puramente de log, que só têm `createdAt`).
- IDs são `cuid()`.

## 1. Enums

```prisma
enum Role            { ADMIN GERENTE RECEPCAO BARBEIRO CLIENTE }
enum BillingPeriod   { MONTHLY YEARLY }
enum SubscriptionStatus { PENDING ACTIVE PAST_DUE CANCELLED EXPIRED }
enum PaymentStatus   { PENDING PAID FAILED REFUNDED CANCELLED }
enum PaymentType     { CASH PIX CARD SUBSCRIPTION OTHER }
enum AppointmentStatus { PENDING CONFIRMED COMPLETED CANCELLED NO_SHOW }
```

## 2. Entidades

### User (autenticação)
Representa qualquer pessoa que faz login. `role` define o RBAC. Um `User` pode estar vinculado a **no máximo um** `Customer` ou **um** `Barber` (nunca ambos).

| Campo | Tipo | Regras |
|---|---|---|
| id | String (cuid) | PK |
| name | String | |
| email | String | unique |
| passwordHash | String | Argon2id |
| role | Role | default CLIENTE |
| active | Boolean | default true |
| customerId | String? | FK → Customer, unique |
| barberId | String? | FK → Barber, unique |
| createdAt / updatedAt | DateTime | |

### Customer
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| name | String | |
| cpf | String | **unique**, normalizado (somente dígitos) |
| phone | String | normalizado (somente dígitos, com DDI/DDD) |
| email | String? | |
| birthDate | DateTime? | |
| notes | String? | |
| active | Boolean | default true |
| deletedAt | DateTime? | soft delete |
| createdAt / updatedAt | DateTime | |

Índices: `@@index([cpf])` (além do unique), `@@index([phone])`.

### Barber
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| name | String | |
| phone | String? | |
| email | String? | |
| photo | String? | URL |
| defaultCommissionPercentage | Decimal(5,2) | comissão padrão quando não há `CommissionRule` específica para o serviço |
| active | Boolean | default true |
| deletedAt | DateTime? | |
| createdAt / updatedAt | DateTime | |

### Service
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| name | String | |
| description | String? | |
| price | Decimal(10,2) | |
| durationMinutes | Int | |
| active | Boolean | default true |
| deletedAt | DateTime? | |
| createdAt / updatedAt | DateTime | |

### CommissionRule
Comissão específica de um barbeiro para um serviço. Se não existir linha aqui, usa `Barber.defaultCommissionPercentage`.

| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| barberId | String | FK → Barber |
| serviceId | String | FK → Service |
| percentage | Decimal(5,2) | |
| active | Boolean | default true |
| createdAt / updatedAt | DateTime | |

`@@unique([barberId, serviceId])` — no máximo uma regra ativa por par barbeiro/serviço.

### Plan
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| name | String | |
| description | String? | |
| price | Decimal(10,2) | |
| billingPeriod | BillingPeriod | default MONTHLY |
| active | Boolean | default true |
| deletedAt | DateTime? | |
| createdAt / updatedAt | DateTime | |

### Subscription
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| customerId | String | FK → Customer |
| planId | String | FK → Plan |
| status | SubscriptionStatus | default PENDING |
| price | Decimal(10,2) | **snapshot** do preço do plano no momento da contratação — não referencia `Plan.price` atual |
| startedAt | DateTime? | |
| currentPeriodStart | DateTime? | |
| currentPeriodEnd | DateTime? | |
| cancelledAt | DateTime? | |
| externalSubscriptionId | String? | unique — id no gateway de pagamento |
| createdAt / updatedAt | DateTime | |

Índices: `@@index([customerId])`, `@@index([status])`.

### Payment
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| customerId | String | FK → Customer |
| subscriptionId | String? | FK → Subscription |
| amount | Decimal(10,2) | |
| status | PaymentStatus | default PENDING (`PAID` marca sucesso — note que **não** é a mesma coisa que `externalPaymentId`, que é a chave de idempotência) |
| paymentType | PaymentType | |
| externalPaymentId | String? | unique — id do pagamento no gateway, quando houver |
| paidAt | DateTime? | |
| createdAt / updatedAt | DateTime | |

### SubscriptionStatusHistory
Toda mudança de status de uma assinatura gera uma linha aqui — nunca sobrescrevemos o status
"silenciosamente" (seção "HISTÓRICO DE STATUS" do produto).

| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| subscriptionId | String | FK → Subscription |
| fromStatus | SubscriptionStatus? | null na primeira entrada (criação) |
| toStatus | SubscriptionStatus | |
| reason | String? | ex.: "Pagamento inicial confirmado", "Webhook: payment.failed" |
| createdAt | DateTime | |

Índices: `@@index([subscriptionId])`.

### PaymentEvent
Garante idempotência do webhook: o mesmo evento do gateway nunca é processado duas vezes.

| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| provider | String | nome do `PaymentProvider` (ex.: "manual") |
| externalEventId | String | id do evento no gateway |
| eventType | String | ex.: "payment.approved" |
| payloadHash | String | SHA-256 do corpo bruto, para auditoria |
| processedAt | DateTime? | preenchido só depois do processamento concluir com sucesso |
| createdAt | DateTime | |

`@@unique([provider, externalEventId])` — a constraint que efetivamente impede reprocessamento.

### Attendance (atendimento — núcleo do sistema)
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| customerId | String | FK → Customer |
| barberId | String | FK → Barber |
| serviceId | String | FK → Service |
| subscriptionId | String? | FK → Subscription, preenchido quando `paymentType = SUBSCRIPTION` |
| priceReference | Decimal(10,2) | **snapshot** de `Service.price` no momento do atendimento |
| commissionPercentage | Decimal(5,2) | **snapshot** da regra vigente (CommissionRule ou default do barbeiro) |
| commissionValue | Decimal(10,2) | **snapshot** = `priceReference * commissionPercentage / 100` |
| paymentType | PaymentType | |
| notes | String? | |
| createdAt | DateTime | |

**Regra inviolável**: `commissionPercentage`, `commissionValue` e `priceReference` são gravados no momento da criação e **nunca recalculados**. Alterar `CommissionRule` ou `Service.price` depois não deve, sob nenhuma circunstância, alterar atendimentos já registrados. Toda leitura de relatório de comissão soma essas colunas diretamente, nunca faz JOIN com `CommissionRule` para obter o percentual "atual".

Índices: `@@index([customerId])`, `@@index([barberId])`, `@@index([serviceId])`, `@@index([createdAt])` (usado por praticamente todo relatório com filtro de período).

### Appointment
| Campo | Tipo | Regras |
|---|---|---|
| id | String | PK |
| customerId | String | FK → Customer |
| barberId | String | FK → Barber |
| serviceId | String | FK → Service |
| scheduledDate | DateTime (date only) | |
| startTime | String ("HH:mm") ou DateTime combinado | ver nota abaixo |
| endTime | String / DateTime | calculado a partir de `Service.durationMinutes` |
| status | AppointmentStatus | default PENDING |
| notes | String? | |
| createdAt / updatedAt | DateTime | |

`@@unique([barberId, scheduledDate, startTime])` — impede dois agendamentos no mesmo horário para o mesmo barbeiro **no nível do banco**, não só na aplicação.

Nota de implementação: `scheduledDate` + `startTime`/`endTime` serão armazenados como `DateTime` únicos combinando data+hora (ex.: `startAt`, `endAt` em UTC), simplificando comparação de conflitos; a constraint de unicidade usa `(barberId, startAt)`.

### BusinessSetting
Linha única (singleton) com as configurações públicas da barbearia (seção 30).

| Campo | Tipo |
|---|---|
| id | String (fixo, ex.: "default") |
| name, logoUrl, phone, whatsapp, instagram, address, googleMapsUrl | String? |
| openingHours | Json |
| whatsappMessageTemplate | String |
| createdAt / updatedAt | DateTime |

### AuditLog
| Campo | Tipo |
|---|---|
| id | String |
| userId | String? (quem realizou a ação) |
| action | String (ex.: "UPDATE", "DELETE", "COMMISSION_CHANGE") |
| entity | String (ex.: "Barber") |
| entityId | String |
| metadata | Json (diff antes/depois) |
| ip | String? |
| userAgent | String? |
| createdAt | DateTime |

Índices: `@@index([entity, entityId])`, `@@index([createdAt])`.

## 3. Relacionamentos (resumo)

```
User 1—0..1 Customer
User 1—0..1 Barber
Customer 1—N Subscription
Customer 1—N Payment
Customer 1—N Attendance
Customer 1—N Appointment
Barber   1—N Attendance
Barber   1—N Appointment
Barber   1—N CommissionRule
Service  1—N Attendance
Service  1—N Appointment
Service  1—N CommissionRule
Plan     1—N Subscription
Subscription 1—N Payment
Subscription 1—N Attendance (quando paga por assinatura)
Subscription 1—N SubscriptionStatusHistory
```

`PaymentEvent` não tem FK para nada — é uma tabela de idempotência pura, correlacionada a uma
`Subscription` apenas indiretamente via `externalSubscriptionId` dentro do payload já processado.

Também atualizado nesta seção (Etapa 5): `Subscription.updatedAt` deixou de existir sozinho — o
histórico de status agora complementa (nunca substitui) a coluna `status` atual, e `Payment` ganhou
`updatedAt`.

Ver ERD completo em `docs/DIAGRAMS.md`.

## 4. Migrations

Geridas via `prisma migrate dev` em desenvolvimento e `prisma migrate deploy` em produção (rodado no build da Vercel). Nunca editar uma migration já aplicada em produção — sempre criar uma nova.
