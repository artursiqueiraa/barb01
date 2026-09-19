/** Monta o link wa.me com mensagem pré-formatada. Nunca espalhar strings de WhatsApp pelo projeto (seção 28). */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function renderTemplate(template: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, value),
    template,
  );
}
