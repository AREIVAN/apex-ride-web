import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring w-full min-h-11 rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none",
        "placeholder:text-slate-400 focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)] aria-[invalid=true]:border-rose-400 aria-[invalid=true]:bg-rose-50/60",
        props.className
      )}
      {...props}
    />
  );
}
