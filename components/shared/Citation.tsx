export function Citation({ source }: { source: string }) {
  return (
    <span className="text-[9px] text-slate-600 ml-1">
      Source: {source}
    </span>
  );
}
