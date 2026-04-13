"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/features/auth/actions/logout-action";
import { Button } from "@/features/shared/ui/button";
import { cn } from "@/lib/utils/cn";
import { closeMobileNavDrawer, toggleMobileNavDrawer } from "./mobile-nav-drawer-state";
import { navigationItems } from "./navigation-items";

interface MobileNavDrawerProps {
  isAdmin?: boolean;
}

export function MobileNavDrawer({ isAdmin = false }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const drawerTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const closeDrawer = useCallback(() => {
    setOpen(closeMobileNavDrawer());
  }, []);

  const handleTriggerClick = useCallback(() => {
    setOpen((previousOpen) => toggleMobileNavDrawer(previousOpen));
  }, []);

  const getFocusableElements = () => {
    if (!drawerRef.current) {
      return [] as HTMLElement[];
    }

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    return Array.from(drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
    );
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    closeDrawer();
  }, [closeDrawer, pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstTarget = closeButtonRef.current ?? getFocusableElements()[0] ?? drawerRef.current;
    firstTarget?.focus();
  }, [closeDrawer, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!activeElement || activeElement === firstElement || !drawerRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!activeElement || activeElement === lastElement || !drawerRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDrawer, open]);

  useEffect(() => {
    if (!open && wasOpenRef.current) {
      triggerRef.current?.focus();
    }

    wasOpenRef.current = open;
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        data-testid="mobile-nav-trigger"
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="mobile-main-nav"
        onClick={handleTriggerClick}
        className="focus-ring relative z-[60] inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300/90 bg-white/90 text-slate-700 shadow-[0_6px_16px_rgba(20,34,58,0.1)] active:scale-[0.98]"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        )}
      </button>

      {isMounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 overflow-hidden" aria-hidden={!open}>
              <div
                data-testid="mobile-nav-backdrop"
                className="absolute inset-0 bg-slate-900/20 opacity-100 transition-opacity duration-200"
                onClick={closeDrawer}
                aria-hidden
              />

              <aside
                ref={drawerRef}
                data-testid="mobile-nav-drawer"
                id="mobile-main-nav"
                role="dialog"
                aria-modal="true"
                aria-labelledby={drawerTitleId}
                aria-label="Navegacion principal"
                aria-hidden={!open}
                className="absolute right-0 top-0 z-10 flex h-dvh w-[min(90vw,22rem)] translate-x-0 flex-col overflow-y-auto border-l border-slate-200/80 bg-white/98 p-4 shadow-[0_20px_50px_rgba(12,33,61,0.2)] transition-[transform,visibility] duration-200 visible"
              >
                <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">Apex Ride</p>
                    <p id={drawerTitleId} className="text-sm font-semibold text-slate-800">
                      Menu
                    </p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    data-testid="mobile-nav-close"
                    onClick={closeDrawer}
                    className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300/85 bg-white text-slate-600"
                    aria-label="Cerrar menu"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                <nav className="space-y-2" aria-label="Navegacion mobile">
                  {navigationItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeDrawer}
                        className={cn(
                          "focus-ring flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold",
                          active
                            ? "border-brand-200 bg-gradient-to-r from-brand-100/90 to-brand-50 text-brand-900"
                            : "border-slate-200 bg-white text-slate-700"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "inline-flex min-h-7 min-w-7 items-center justify-center rounded-md border text-[10px]",
                            active ? "border-brand-200 bg-white text-brand-700" : "border-slate-200 bg-slate-50 text-slate-500"
                          )}
                        >
                          {item.icon}
                        </span>
                        {item.mobileLabel}
                      </Link>
                    );
                  })}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={closeDrawer}
                      className="focus-ring flex min-h-12 items-center rounded-xl border border-red-300/80 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
                    >
                      Admin
                    </Link>
                  )}
                </nav>

                <div className="mt-auto space-y-2 pt-6">
                  <Link
                    href="/record"
                    onClick={closeDrawer}
                    className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Iniciar rodada
                  </Link>
                  <form action={logoutAction}>
                    <Button variant="ghost" type="submit" className="w-full">
                      Salir
                    </Button>
                  </form>
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
