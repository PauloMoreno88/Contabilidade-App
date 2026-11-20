import { MessageCircle } from "lucide-react";
import { mobileBar, whatsappLink } from "@/config/site";

/** Phone only: the two main actions stay at hand while scrolling. */
export function MobileBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-line bg-white px-4 pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2.5 sm:hidden">
      <a href="#simulador" className="btn btn-primary flex-1 px-3">{mobileBar.simulate}</a>
      <a href={whatsappLink()} target="_blank" rel="noopener" className="btn flex-1 bg-wa px-3 text-[#05210f] hover:bg-wa-dark">
        <MessageCircle size={18} aria-hidden="true" />
        {mobileBar.whatsapp}
      </a>
    </div>
  );
}
