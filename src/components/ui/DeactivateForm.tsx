export function DeactivateForm({
  action,
  label = "Desativar",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  return (
    <form action={action}>
      <button type="submit" className="text-sm text-red-600 hover:underline">
        {label}
      </button>
    </form>
  );
}
