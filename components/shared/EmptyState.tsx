import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-10 h-10 text-slate-600 mb-4" />
      <p className="text-slate-400 font-medium text-sm">{title}</p>
      {subtitle && (
        <p className="text-slate-600 text-xs mt-1 max-w-xs">{subtitle}</p>
      )}
    </div>
  );
}
