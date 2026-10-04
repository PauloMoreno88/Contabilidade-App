import { MessageCircle } from "lucide-react";
import { footer, whatsappLink } from "@/config/site";

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener"
      aria-label={footer.whatsappLabel}
      className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-wa text-[#06130c] shadow-[0_10px_24px_-8px_rgba(37,211,102,0.5)] transition hover:scale-105 hover:bg-wa-dark sm:bottom-6 sm:right-6"
    >
      <MessageCircle size={26} strokeWidth={1.6} aria-hidden="true" />
    </a>
  );
}
