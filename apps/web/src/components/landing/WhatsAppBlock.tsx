import { whatsappBlock as copy } from "@/config/site";

/** Navy block with a phone showing the tax guide arriving on WhatsApp. The phone hangs over the next section. */
export function WhatsAppBlock() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-x">
        <div className="relative grid gap-8 rounded-[26px] bg-navy px-[22px] py-8 text-white md:p-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.9fr)]">
          <div>
            <span className="kicker text-[#ff8f99]">{copy.kicker}</span>
            <h2 className="section-title text-white">{copy.title}</h2>
            <p className="mt-3.5 max-w-[58ch] text-[1.08rem] text-on-navy">{copy.sub}</p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              {copy.items.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.title}>
                    <span className="mb-3.5 grid size-11 place-items-center rounded-xl bg-brand">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <b className="block text-[1.05rem]">{f.title}</b>
                    <p className="mt-1.5 text-[0.93rem] text-on-navy-faint">{f.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
          <Phone />
        </div>
      </div>
    </section>
  );
}

function Phone() {
  const { chat } = copy;
  return (
    <div className="w-[270px] self-start justify-self-center rounded-[34px] bg-[#0b1a29] p-3 shadow-[0_30px_60px_rgba(0,0,0,.35)] lg:-mb-[110px] lg:-mt-5" aria-hidden="true">
      <div className="flex h-[480px] flex-col overflow-hidden rounded-3xl bg-[#e9e3da] lg:h-[520px]">
        <div className="flex items-center gap-2.5 bg-[#0f5a4c] p-3.5 text-[0.9rem] text-white">
          <span className="grid size-8 place-items-center rounded-full bg-navy p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trace.svg" alt="" className="h-auto w-full" />
          </span>
          <div>
            {chat.name}
            <small className="block text-[0.75rem] text-[#bfe3d8]">{chat.status}</small>
          </div>
        </div>
        <div className="grid content-start gap-2 px-3 py-3.5">
          {chat.messages.map((m) => (
            <div
              key={m.time + m.text}
              className={`max-w-[88%] px-[11px] py-[9px] text-[0.84rem] leading-[1.4] text-[#1d2a35] shadow-[0_1px_0_rgba(0,0,0,.08)] ${
                m.me ? "justify-self-end rounded-[10px_10px_2px_10px] bg-[#d8f8c8]" : "rounded-[10px_10px_10px_2px] bg-white"
              }`}
            >
              {m.text}
              {"file" in m && m.file && (
                <span className="my-1 flex items-center gap-2.5 rounded-lg bg-[#f3f5f7] p-[9px]">
                  <span className="grid h-9 w-[30px] place-items-center rounded bg-brand text-[0.62rem] font-bold text-white">PDF</span>
                  <span>
                    <b className="block text-[0.82rem]">{m.file.name}</b>
                    <small className="text-[0.72rem] text-[#6b7884]">{m.file.due}</small>
                  </span>
                </span>
              )}
              {"after" in m && m.after}
              <time className="mt-0.5 block text-right text-[0.68rem] text-[#7a8792]">{m.time}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
