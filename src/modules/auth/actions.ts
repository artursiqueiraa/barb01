"use server";

import { toActionErrorMessage } from "@/lib/actions/errors";

import { authService } from "./service";

export type RegisterActionState = { success: boolean; error?: string };

export async function registerCustomerAction(
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  try {
    const raw = Object.fromEntries(formData.entries());
    await authService.registerCustomer(raw);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}
