/**
 * Calcula o valor de comissão a partir do preço de referência e do percentual
 * vigente no momento do atendimento. Arredonda para 2 casas decimais (dinheiro).
 *
 * Este valor, junto com `priceReference` e `percentage`, é gravado como
 * snapshot no Attendance e nunca recalculado depois (seção 11 do produto).
 */
export function calculateCommissionValue(priceReference: number, percentage: number): number {
  return Number(((priceReference * percentage) / 100).toFixed(2));
}
