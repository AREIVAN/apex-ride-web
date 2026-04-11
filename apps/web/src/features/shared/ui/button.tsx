import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PropsWithChildren {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-[0_10px_24px_rgba(23,99,127,0.36)] hover:from-brand-500 hover:to-brand-600",
  secondary:
    "border border-slate-300/90 bg-white/90 text-slate-900 shadow-[0_8px_20px_rgba(34,51,76,0.08)] hover:border-slate-400 hover:bg-white",
  ghost: "border border-transparent bg-transparent text-slate-800 hover:border-slate-300/80 hover:bg-slate-100/75",
  destructive: "border border-transparent bg-red-600 text-white hover:bg-red-700"
};

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
        "interactive-lift transition-transform duration-200 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variantClasses[variant],
        className
      )}
      aria-busy={props.disabled ? true : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
