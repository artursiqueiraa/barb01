import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}

export function Thead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-zinc-50 text-xs uppercase text-zinc-500" {...props} />;
}

export function Tbody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-zinc-100" {...props} />;
}

export function Tr(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="hover:bg-zinc-50" {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 font-medium", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-zinc-700", className)} {...props} />;
}
