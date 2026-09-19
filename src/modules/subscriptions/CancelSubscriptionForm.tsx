import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { cancelSubscriptionAction } from "./actions";

export function CancelSubscriptionForm({ subscriptionId }: { subscriptionId: string }) {
  return (
    <form action={cancelSubscriptionAction.bind(null, subscriptionId)} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px]">
        <Input name="reason" placeholder="Motivo (opcional)" />
      </div>
      <Button type="submit" variant="danger" size="sm">
        Cancelar assinatura
      </Button>
    </form>
  );
}
