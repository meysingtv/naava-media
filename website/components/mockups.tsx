import Image from "next/image";
import { CheckCircle2, Sparkles, Wrench } from "lucide-react";

import { cn } from "@/components/ui";

/* Laptop-Rahmen – wie auf Produktseiten dieser Branche üblich */
export function LaptopFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full", className)}>
      <div className="rounded-[22px] bg-[#1c1c1e] p-2.5 shadow-lift sm:p-3">
        <div className="overflow-hidden rounded-[12px] bg-white text-ink">{children}</div>
      </div>
      <div className="mx-auto h-[14px] w-[94%] rounded-b-[16px] bg-[#2c2c2e]" />
      <div className="mx-auto h-[6px] w-[36%] rounded-b-md bg-[#3a3a3c]" />
    </div>
  );
}

/* Browser-Rahmen um eine App-Ansicht */
export function BrowserFrame({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-white shadow-card", className)}>
      <div className="flex h-9 items-center gap-1.5 border-b border-line bg-paper px-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="h-2.5 w-2.5 rounded-full bg-line2" />
        <span className="ml-3 flex h-5 flex-1 items-center rounded-md border border-line bg-white px-2.5 text-[11px] text-muted">{url}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * Echter Screenshot der Software (public/images/app). Aufgenommen mit 1440 px
 * Breite bei doppelter Auflösung; `ratio` entspricht dem Aufnahme-Viewport.
 */
export function AppShot({
  src,
  alt,
  priority,
  ratio = "aspect-[16/10]",
  sizes = "(max-width: 768px) 100vw, 640px",
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  ratio?: string;
  sizes?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-white", ratio, className)}>
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover object-top" />
    </div>
  );
}

/* Handy-Rahmen mit echtem Screenshot der Schüler-App (390 × 760 aufgenommen) */
export function PhoneShot({ src, alt, priority, className }: { src: string; alt: string; priority?: boolean; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-[236px]", className)}>
      <div className="rounded-[38px] bg-[#1c1c1e] p-[9px] shadow-lift">
        <div className="relative aspect-[39/76] overflow-hidden rounded-[30px] bg-white">
          <Image src={src} alt={alt} fill priority={priority} sizes="236px" className="object-cover object-top" />
        </div>
      </div>
    </div>
  );
}

/* KI-Assistent – Beispielgespräch (der echte Assistent braucht einen API-Schlüssel) */
export function ChatMock() {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2 border-b border-line pb-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-mint-soft text-mint">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13px] font-bold">Assistent</span>
        <span className="text-[11px] text-muted">KI · Beta</span>
      </div>
      <div className="mt-3 space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-mint px-3 py-2 text-[12.5px] text-white">
            Plane Jonas nächste Woche zwei Fahrstunden ein, möglichst nach 17 Uhr.
          </div>
        </div>
        <div className="flex gap-2">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-mint-soft text-mint">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="max-w-[92%] whitespace-pre-line rounded-2xl bg-paper px-3 py-2 text-[12.5px]">
              Zwei passende Termine gefunden:{"\n"}– Di 17:30 Uhr bei Lisa (B-FS 1234){"\n"}– Do 18:15 Uhr bei Marco (B-FS 5678){"\n"}Beide Fahrzeuge sind frei.
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-mint-soft px-1.5 py-0.5 text-[10.5px] font-bold text-mint">
                <Wrench className="h-3 w-3" /> Freie Termine geprüft
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-mint-soft px-1.5 py-0.5 text-[10.5px] font-bold text-mint">
                <CheckCircle2 className="h-3 w-3" /> 2 Termine angelegt
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
