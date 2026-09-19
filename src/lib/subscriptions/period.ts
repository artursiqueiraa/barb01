import { addMonths, addYears } from "date-fns";

export type BillingPeriod = "MONTHLY" | "YEARLY";

/** Calcula o fim do período de cobrança a partir de uma data de início. */
export function calculatePeriodEnd(start: Date, billingPeriod: BillingPeriod): Date {
  return billingPeriod === "YEARLY" ? addYears(start, 1) : addMonths(start, 1);
}
