# DIAGRAMAS

## 1. Arquitetura
Ver `docs/ARCHITECTURE.md` seção 1.

## 2. ERD

```mermaid
erDiagram
    USER ||--o| CUSTOMER : "opcional"
    USER ||--o| BARBER : "opcional"
    CUSTOMER ||--o{ SUBSCRIPTION : possui
    CUSTOMER ||--o{ PAYMENT : realiza
    CUSTOMER ||--o{ ATTENDANCE : recebe
    CUSTOMER ||--o{ APPOINTMENT : agenda
    BARBER ||--o{ ATTENDANCE : executa
    BARBER ||--o{ APPOINTMENT : atende
    BARBER ||--o{ COMMISSION_RULE : possui
    SERVICE ||--o{ ATTENDANCE : referenciado
    SERVICE ||--o{ APPOINTMENT : referenciado
    SERVICE ||--o{ COMMISSION_RULE : referenciado
    PLAN ||--o{ SUBSCRIPTION : origina
    SUBSCRIPTION ||--o{ PAYMENT : gera
    SUBSCRIPTION ||--o{ ATTENDANCE : "paga por"
    SUBSCRIPTION ||--o{ SUBSCRIPTION_STATUS_HISTORY : registra

    USER {
        string id PK
        string email UK
        string role
    }
    CUSTOMER {
        string id PK
        string name
        string cpf UK
        string phone
        boolean active
    }
    BARBER {
        string id PK
        string name
        decimal defaultCommissionPercentage
        boolean active
    }
    SERVICE {
        string id PK
        string name
        decimal price
        int durationMinutes
    }
    COMMISSION_RULE {
        string id PK
        string barberId FK
        string serviceId FK
        decimal percentage
    }
    PLAN {
        string id PK
        string name
        decimal price
        string billingPeriod
    }
    SUBSCRIPTION {
        string id PK
        string customerId FK
        string planId FK
        string status
        decimal price
    }
    PAYMENT {
        string id PK
        string customerId FK
        string subscriptionId FK
        decimal amount
        string status
        string externalPaymentId UK
    }
    SUBSCRIPTION_STATUS_HISTORY {
        string id PK
        string subscriptionId FK
        string fromStatus
        string toStatus
        string reason
    }
    PAYMENT_EVENT {
        string id PK
        string provider
        string externalEventId UK
        string eventType
        datetime processedAt
    }
    ATTENDANCE {
        string id PK
        string customerId FK
        string barberId FK
        string serviceId FK
        string subscriptionId FK
        decimal priceReference
        decimal commissionPercentage
        decimal commissionValue
        string paymentType
    }
    APPOINTMENT {
        string id PK
        string customerId FK
        string barberId FK
        string serviceId FK
        datetime startAt
        string status
    }
```

## 3. Fluxo de assinatura

Implementado com o provider `manual` (ver `docs/PAYMENTS.md`) — o mesmo fluxo funciona com um
gateway real trocando apenas a implementação de `PaymentProvider` e o passo 5 (confirmação manual)
por um webhook automático.

```mermaid
sequenceDiagram
    participant C as Cliente (/perfil/assinatura)
    participant Svc as subscriptionsService
    participant PP as PaymentProvider (manual)
    participant R as Recepção/Admin (/admin/assinaturas)
    participant DB as Banco

    C->>Svc: createCheckout(planId)
    Svc->>DB: cria Subscription (status=PENDING, price=snapshot do plano)
    Svc->>DB: SubscriptionStatusHistory (null -> PENDING)
    Svc->>PP: createCheckout()
    PP-->>Svc: instruções de pagamento (Pix/dinheiro/cartão)
    Svc-->>C: exibe instruções
    Note over C,R: Cliente paga por fora (Pix/dinheiro/cartão físico)
    R->>Svc: confirmPayment(subscriptionId, valor, forma)
    Svc->>DB: cria Payment (status=PAID)
    Svc->>DB: Subscription.status = ACTIVE, currentPeriodStart/End calculados
    Svc->>DB: SubscriptionStatusHistory (PENDING -> ACTIVE)
```

## 4. Fluxo de atendimento

```mermaid
flowchart TD
    A[Recepção busca cliente] --> B[Seleciona serviço]
    B --> C[Seleciona barbeiro]
    C --> D{Cliente tem assinatura ATIVA compatível?}
    D -- Sim --> E[paymentType = SUBSCRIPTION]
    D -- Não --> F[Seleciona forma de pagamento: CASH/PIX/CARD/OTHER]
    E --> G[Sistema resolve comissão: CommissionRule do par barbeiro+serviço, senão default do barbeiro]
    F --> G
    G --> H[Calcula commissionValue = priceReference * percentage / 100]
    H --> I[Grava Attendance com snapshot: priceReference, commissionPercentage, commissionValue]
    I --> J[Atualiza histórico do cliente e do barbeiro]
```

## 5. Fluxo de comissão

```mermaid
flowchart LR
    S[Service.price] --> Snap1[priceReference no Attendance]
    CR["CommissionRule (barbeiro+serviço) OU Barber.defaultCommissionPercentage"] --> Snap2[commissionPercentage no Attendance]
    Snap1 --> Calc["commissionValue = priceReference × commissionPercentage / 100"]
    Snap2 --> Calc
    Calc --> Persist[Gravado permanentemente no Attendance]
    Persist -.não é recalculado.-> Report[Relatório de comissão soma commissionValue direto]
    ChangeRule[Mudança futura na CommissionRule] -.NÃO afeta.-> Persist
```

## 6. Fluxo de pagamento (webhook)

Testado ponta a ponta durante o desenvolvimento: assinatura ausente/inválida rejeitada com 401,
evento reenviado idêntico não duplica `Payment` (ver `docs/PAYMENTS.md`).

```mermaid
sequenceDiagram
    participant PP as Gateway de Pagamento
    participant WH as /api/webhooks/payment
    participant Ev as payment_events
    participant Svc as subscriptionsService
    participant DB as Banco

    PP->>WH: POST evento + header x-signature
    WH->>WH: verifyWebhookSignature (HMAC-SHA256, timingSafeEqual)
    alt assinatura ausente/inválida
        WH-->>PP: 401
    else válida
        WH->>WH: parseWebhookEvent(rawBody)
        WH->>Ev: busca por [provider, externalEventId]
        alt evento já processado
            WH-->>PP: 200 { duplicate: true } (idempotente, não reprocessa)
        else evento novo
            WH->>Ev: cria registro (processedAt = null)
            WH->>Svc: processWebhookEvent(event)
            Svc->>DB: localiza Subscription por externalSubscriptionId
            alt status = PAID
                Svc->>Svc: confirmPayment() — mesmo caminho do fluxo manual
            else status = FAILED
                Svc->>Svc: markPaymentFailed() -> ACTIVE vira PAST_DUE
            else status = CANCELLED
                Svc->>Svc: cancel()
            end
            WH->>Ev: marca processedAt = now
            WH-->>PP: 200 { handled: true }
        end
    end
```

## 6.1 Fluxo de inadimplência

```mermaid
stateDiagram-v2
    [*] --> PENDING: checkout
    PENDING --> ACTIVE: confirmPayment (1º pagamento)
    PENDING --> CANCELLED: cliente desiste
    ACTIVE --> PAST_DUE: markPaymentFailed (cobrança recorrente falhou)
    PAST_DUE --> ACTIVE: confirmPayment (regularizado)
    PAST_DUE --> CANCELLED: cancel (inadimplência não resolvida)
    ACTIVE --> CANCELLED: cancel (cliente pediu)
    CANCELLED --> [*]
    EXPIRED --> [*]

    note right of PAST_DUE
        Regra do MVP: só ACTIVE libera
        benefício (hasActiveBenefits()).
        PAST_DUE NÃO conta como
        assinatura ativa num atendimento.
    end note
```

## 7. Fluxo de agendamento

```mermaid
flowchart TD
    A[Cliente ou recepção escolhe barbeiro/serviço/data/hora] --> B{Barbeiro ativo?}
    B -- Não --> X[Erro: barbeiro inativo]
    B -- Sim --> C{Serviço ativo?}
    C -- Não --> Y[Erro: serviço inativo]
    C -- Sim --> D{Já existe Appointment para esse barbeiro+horário?}
    D -- Sim --> Z[Erro: conflito de horário - constraint unique no banco]
    D -- Não --> E[Cria Appointment status=PENDING]
    E --> F[Envia confirmação via WhatsAppService]
```

## 8. RBAC

```mermaid
flowchart TB
    ADMIN --> ALL[Acesso total]
    GERENTE --> R1[dashboard, clientes, barbeiros, serviços, planos, assinaturas, atendimentos, relatórios, financeiro]
    RECEPCAO --> R2[clientes, atendimentos, agendamentos, visualizar assinaturas]
    BARBEIRO --> R3[seus atendimentos, seus relatórios, dados necessários do cliente]
    CLIENTE --> R4[próprio perfil, própria assinatura, próprios pagamentos, próprio histórico, agendamento]

    GERENTE -.não pode.-> Cfg[configurações críticas / permissões de ADMIN]
    BARBEIRO -.não pode.-> Fin[alterar comissão, dados financeiros, área administrativa]
```

## 9. Deployment
Ver `docs/ARCHITECTURE.md` seção 8 e `docs/DEPLOYMENT.md`.
