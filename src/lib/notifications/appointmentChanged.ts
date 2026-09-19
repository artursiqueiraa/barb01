import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { buildWhatsAppLink, renderTemplate } from "@/lib/whatsapp/service";

const DELAY_MESSAGE_TEMPLATE =
  "Olá, {{customerName}}!\n\n" +
  "Seu horário na barbearia teve um pequeno ajuste devido a um atraso no atendimento anterior.\n\n" +
  "Horário anterior:\n{{previousRange}}\n\n" +
  "Novo horário:\n{{newRange}}\n\n" +
  "Pedimos desculpas pelo transtorno e agradecemos a compreensão.\n\n" +
  "Até breve! 💈";

function formatRange(startAt: Date, endAt: Date): string {
  return `${format(startAt, "HH:mm", { locale: ptBR })}–${format(endAt, "HH:mm", { locale: ptBR })}`;
}

export interface AppointmentChangedInput {
  customerName: string;
  customerPhone: string;
  previousStartAt: Date;
  previousEndAt: Date;
  newStartAt: Date;
  newEndAt: Date;
}

export interface AppointmentChangedNotification {
  event: "AGENDAMENTO_ALTERADO";
  message: string;
  /** Link wa.me pronto para a recepção/barbeiro clicarem e avisar manualmente (Etapa 7 ainda não integra envio automático). */
  whatsappLink: string;
}

/**
 * Ponto único de extensão para o evento AGENDAMENTO_ALTERADO. O projeto não
 * tem fila/barramento de eventos (decisão arquitetural — ver
 * docs/ARCHITECTURE.md), então hoje isso só monta a mensagem/preview e o
 * link wa.me (reaproveitando `renderTemplate`/`buildWhatsAppLink`, que ainda
 * não tinham nenhum chamador no projeto). Quando a integração WhatsApp da
 * Etapa 7 existir, este é o único lugar a trocar por um envio real — nunca
 * fingir aqui que um provedor está configurado.
 */
export function notifyAppointmentChanged(input: AppointmentChangedInput): AppointmentChangedNotification {
  const message = renderTemplate(DELAY_MESSAGE_TEMPLATE, {
    customerName: input.customerName,
    previousRange: formatRange(input.previousStartAt, input.previousEndAt),
    newRange: formatRange(input.newStartAt, input.newEndAt),
  });

  return {
    event: "AGENDAMENTO_ALTERADO",
    message,
    whatsappLink: buildWhatsAppLink(input.customerPhone, message),
  };
}

const ANTICIPATION_REJECTED_TEMPLATE =
  "Olá, {{customerName}}!\n\n" +
  "Seu pedido de antecipação não foi aprovado.\n\n" +
  "Seu agendamento permanece às {{keptTime}}.\n\n" +
  "Até breve! 💈";

export interface AnticipationRejectedInput {
  customerName: string;
  customerPhone: string;
  keptStartAt: Date;
}

/** Recusa de solicitação de antecipação: horário original é mantido, cliente é avisado (link wa.me manual, mesma ressalva do AGENDAMENTO_ALTERADO). */
export function notifyAnticipationRejected(input: AnticipationRejectedInput): AppointmentChangedNotification {
  const message = renderTemplate(ANTICIPATION_REJECTED_TEMPLATE, {
    customerName: input.customerName,
    keptTime: format(input.keptStartAt, "HH:mm", { locale: ptBR }),
  });

  return {
    event: "AGENDAMENTO_ALTERADO",
    message,
    whatsappLink: buildWhatsAppLink(input.customerPhone, message),
  };
}
