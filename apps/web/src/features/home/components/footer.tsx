import Image from "next/image";
import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Rides", href: "/rides" },
  { label: "Segmentos", href: "/segments" },
  { label: "Mapas", href: "/record" }
] as const;

const COMPANY_LINKS = [
  { label: "Acerca de", href: "#" },
  { label: "Roadmap", href: "#" },
  { label: "Soporte", href: "#" },
  { label: "Contacto", href: "#" }
] as const;

const LEGAL_LINKS = [
  { label: "Privacidad", href: "#" },
  { label: "Terminos", href: "#" },
  { label: "Cookies", href: "#" }
] as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 md:grid-cols-4 lg:px-10">
        <div className="md:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 text-asphalt-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-asphalt-900 text-xs font-bold tracking-[0.16em] text-white">
              <Image src="/logo.png" alt="Apex Ride" width={22} height={22} className="h-[22px] w-[22px] rounded-full" priority />
            </span>
            <span className="font-[var(--font-heading)] text-base font-semibold tracking-[0.08em]">APEX RIDE</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-asphalt-600">
            Plataforma para movilidad deportiva: registra, analiza y compite con datos reales.
          </p>
        </div>

        <FooterColumn title="Producto" links={PRODUCT_LINKS} />
        <FooterColumn title="Compania" links={COMPANY_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>
      <div className="mx-auto mt-10 w-full max-w-7xl px-5 text-xs text-asphalt-500 sm:px-8 lg:px-10">
        © {new Date().getFullYear()} Apex Ride. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: ReadonlyArray<{ label: string; href: string }> }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-asphalt-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-sm text-asphalt-700 hover:text-asphalt-900">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
