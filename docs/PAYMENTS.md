# PAGAMENTOS — DECISÃO E ARQUITETURA

## Decisão sobre gateway (ADR)

**Estado atual do MVP: provider `manual` (`ManualPaymentProvider`), sem gateway externo real.**

Motivo: nenhuma credencial de gateway foi fornecida, e integrar uma API de pagamento real sem uma
conta/sandbox de verdade para testar geraria código não verificável (o pior tipo de "pronto" — que
não se sabe se funciona). Em vez disso, implementamos a abstração `PaymentProvider` por completo,
com um provider funcional (o cliente realmente consegue assinar hoje: paga por Pix/dinheiro/cartão
físico na recepção, que confirma o recebimento pelo painel) que satisfaz exatamente a mesma
interface que um provider real usaria — trocar um pelo outro depois é só configuração.

### Candidatos avaliados para um provider real futuro

| Gateway | Pix | Cartão recorrente | Webhook | Documentação | Observação |
|---|---|---|---|---|---|
| **Mercado Pago** (recomendado) | Sim | Sim (Preapproval API) | Sim, robusto | Boa, em PT-BR | Maior adoção no Brasil, sandbox gratuito, boa opção para SMB |
| **Asaas** | Sim | Sim | Sim | Boa, em PT-BR | Especializado em cobrança recorrente para pequenos negócios — encaixa bem no caso de uso |
| **Stripe** | Não nativo (requer parceiro local) | Sim | Sim, excelente | Excelente, em inglês | Pix não é de primeira classe; mais atrito para o caso de uso brasileiro |

Recomendação para quando o dono da barbearia tiver uma conta pronta: **Mercado Pago** (assinaturas
via Preapproval + Pix avulso) ou **Asaas** (se preferir uma plataforma pensada especificamente para
cobrança recorrente de pequenos negócios). Nenhuma decisão é definitiva — a abstração existe
justamente para não travar essa escolha.

## Abstração `PaymentProvider`

```ts
// src/lib/payments/provider.ts
interface PaymentProvider {
  readonly name: string;
  createCheckout(input): Promise<CheckoutResult>;
  cancelSubscription(externalSubscriptionId): Promise<void>;
  verifyWebhookSignature(rawBody, signatureHeader): boolean;
  parseWebhookEvent(rawBody): PaymentEventPayload;
}
```

`src/lib/payments/index.ts` escolhe a implementação via `PAYMENT_PROVIDER` (env var). Hoje só existe
`"manual"`. Um provider real vira mais um `case` no `switch`, implementando a mesma interface —
nenhum outro módulo (`modules/subscriptions`, a UI, o webhook) muda.

## Fluxo de checkout (provider manual)

1. Cliente logado escolhe um plano em `/perfil/assinatura`.
2. `createCheckoutAction` → `subscriptionsService.createCheckout`: cria `Subscription` com
   `status = PENDING` e `price` = **snapshot** do preço do plano naquele momento.
3. `ManualPaymentProvider.createCheckout` devolve instruções em texto (nenhum redirect, nenhuma
   chamada de rede).
4. Cliente paga por fora (Pix, dinheiro, cartão físico).
5. Recepção/Admin confirma em `/admin/assinaturas` (`confirmPaymentAction` →
   `subscriptionsService.confirmPayment`): cria um `Payment` (`status = PAID`) e ativa a assinatura
   (`PENDING → ACTIVE`, ou renova se já era `PAST_DUE`/`ACTIVE`).

## Webhook (`/api/webhooks/payment`)

Já está pronto para um gateway real, mesmo sem um plugado hoje:

1. Lê o corpo bruto e o header `x-signature`.
2. `provider.verifyWebhookSignature` — HMAC-SHA256 com `PAYMENT_WEBHOOK_SECRET`, comparação em
   tempo constante (`timingSafeEqual`). Assinatura ausente ou inválida → `401`, nada é processado.
3. `provider.parseWebhookEvent` normaliza o payload específico do gateway num formato comum
   (`PaymentEventPayload`).
4. **Idempotência**: `payment_events` tem `@@unique([provider, externalEventId])`. Se o evento já
   foi processado (`processedAt` preenchido), o webhook responde `200 { duplicate: true }` sem
   tocar em nada — testado em `scratch-webhook-test` durante o desenvolvimento (reenviar o mesmo
   evento não duplica `Payment` nem `Subscription`).
5. `subscriptionsService.processWebhookEvent` localiza a assinatura por `externalSubscriptionId` e
   delega para `confirmPayment` / `markPaymentFailed` / `cancel` — os **mesmos** métodos usados pelo
   fluxo manual, para nunca duplicar regra de negócio entre os dois caminhos.

## Regras de transição de status

Ver `src/lib/subscriptions/transitions.ts` (testado em `transitions.test.ts`):

- `PENDING → ACTIVE | CANCELLED | EXPIRED`
- `ACTIVE → PAST_DUE | CANCELLED | EXPIRED`
- `PAST_DUE → ACTIVE | CANCELLED | EXPIRED`
- `CANCELLED` e `EXPIRED` são terminais — nunca saem desse estado. Para "reassinar", cria-se uma
  **nova** `Subscription` (nunca reabrir uma cancelada).

**Regra do MVP**: só `ACTIVE` dá direito aos benefícios do plano (`hasActiveBenefits()`), inclusive
para o desconto automático de atendimento (`modules/attendances/service.ts`) — uma assinatura
`PAST_DUE` não libera atendimento como `SUBSCRIPTION`.

## Histórico

- `subscription_status_history`: toda mudança de status é registrada com `fromStatus`, `toStatus` e
  `reason` — nunca sobrescrevemos o status "silenciosamente".
- `Subscription.price` é o valor **contratado**, nunca recalculado se o preço do `Plan` mudar depois
  (mesma regra de snapshot do `Attendance`).
- Cancelamento nunca apaga a assinatura — só marca `CANCELLED` + `cancelledAt`, preservando todo o
  histórico financeiro.

## Segurança

- Segredo do webhook (`PAYMENT_WEBHOOK_SECRET`) só em variável de ambiente, nunca no código.
- Nenhum dado de cartão passa pela nossa aplicação — o provider manual não lida com pagamento
  eletrônico; um gateway real (checkout hospedado/tokenização) manteria a mesma garantia.
