import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "gradient-brand flex items-center justify-center rounded-2xl text-primary-foreground shadow-float",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="h-1/2 w-1/2" fill="none">
        <path
          d="M4 11.5 16 5l12 6.5-12 6.5-12-6.5Z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="M9 15v6.2c0 .6.3 1.1.8 1.4C11.6 23.7 13.7 24.5 16 24.5s4.4-.8 6.2-1.9c.5-.3.8-.8.8-1.4V15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="26.5" cy="19.5" r="2.6" fill="currentColor" />
      </svg>
    </div>
  );
}

export function BrandLockup({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark className="h-10 w-10" />
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight">
          Practic<span className="text-primary">IA</span>
        </p>
        {!compact && (
          <p className="text-[11px] text-muted-foreground">Acompañamiento inteligente</p>
        )}
      </div>
    </div>
  );
}
