"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Briefcase,
  Mail,
  Phone,
  CheckCircle2,
  ArrowRight,
  Star,
  Quote,
  MapPin,
  Clock,
  Shield,
  Users,
  Building2,
  ChevronDown,
  Linkedin,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";

// Ajuste seu link de WhatsApp
const linkWhatsapp = "https://wa.me/552199999999"; // substitua pelo número real

export default function LandingExactra() {
  // Scroll progress para a barra superior
  const { scrollYProgress } = useScroll();
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const services = [
    {
      icon: Briefcase,
      title: "Contabilidade Empresarial",
      text: "Gestão contábil completa e estratégica para sua empresa crescer com segurança.",
    },
    {
      icon: Mail,
      title: "Fiscal e Tributário",
      text: "Cumprimento das obrigações fiscais com planejamento tributário eficiente.",
    },
    {
      icon: Phone,
      title: "Consultoria Contábil",
      text: "Suporte e análise para decisões precisas e baseadas em dados.",
    },
  ];

  const steps = [
    {
      title: "1. Diagnóstico",
      text: "Entendemos o momento do seu negócio e mapeamos necessidades e oportunidades.",
    },
    {
      title: "2. Implementação",
      text: "Organizamos documentos, configuramos fluxos e integramos ferramentas.",
    },
    {
      title: "3. Acompanhamento",
      text: "Relatórios, indicadores e suporte contínuo para evoluir com previsibilidade.",
    },
  ];

  const testimonials = [
    {
      name: "Mariana Alves",
      role: "CEO • Loja VidaFit",
      quote:
        "A Exactra trouxe clareza para nossas finanças e reduziu custos tributários. O suporte é rápido e objetivo.",
      avatar: "/avatar-1.jpg",
    },
    {
      name: "Ricardo Nunes",
      role: "Sócio • Nunes Tech",
      quote:
        "Relatórios mensais simples de entender e decisões bem embasadas. Melhor parceria que tivemos.",
      avatar: "/avatar-2.jpg",
    },
    {
      name: "Ana Paula Silva",
      role: "Diretora • Clínica BemViver",
      quote:
        "Organização impecável. O onboarding foi muito fluido e hoje temos previsibilidade de caixa.",
      avatar: "/avatar-3.jpg",
    },
  ];

  const faqs = [
    {
      q: "Como funciona o início da parceria?",
      a: "Começamos com um diagnóstico gratuito. Em seguida, definimos um plano de ação e prazos para organizar documentos, obrigações e rotinas.",
    },
    {
      q: "Vocês atendem MEI, ME ou empresas maiores?",
      a: "Atendemos de MEI a empresas de médio porte. Adequamos processos e indicadores conforme a complexidade do negócio.",
    },
    {
      q: "Vocês utilizam ferramentas digitais?",
      a: "Sim. Integramos sistema fiscal, assinatura eletrônica e pastas inteligentes para agilizar o dia a dia.",
    },
  ];

  const stats = [
    { label: "Empresas atendidas", value: "+180" },
    { label: "Redução média de custos", value: "12%" },
    { label: "Satisfação", value: "4.9/5" },
    { label: "Anos de experiência", value: "10+" },
  ];

  return (
    <div className="min-h-screen bg-[#071420] text-white font-sans scroll-smooth">
      {/* Barra de progresso do scroll */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-[#C82333] via-[#ff4d6d] to-[#ffb703] z-[60]"
        style={{ width }}
      />

      {/* HEADER sticky */}
      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-[#0A1B2A]/70 border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="#" className="flex items-center gap-3">
            <Image src="/trace.svg" alt="EXACTRA" width={42} height={42} />
            <span className="text-xl tracking-wide font-semibold hidden sm:block">EXACTRA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[15px]">
            {[
              { id: "servicos", label: "Serviços" },
              { id: "sobre", label: "Sobre" },
              { id: "processo", label: "Como funciona" },
              { id: "depoimentos", label: "Depoimentos" },
              { id: "orcamento", label: "Orçamento" },
              { id: "contato", label: "Contato" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="relative group text-white/80 hover:text-white transition"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#C82333] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>
          <button
            onClick={() => window.open(linkWhatsapp, "_blank")}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C82333] hover:bg-[#A61B29] transition shadow-lg"
          >
            <MessageCircle size={18} /> Fale Conosco
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Blobs decorativos */}
        <motion.div
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#C82333]/20 blur-3xl"
          animate={{ y: [0, 30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full bg-[#3b82f6]/10 blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-10 items-center pt-28">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-4xl md:text-6xl font-extrabold leading-tight"
            >
              Contabilidade com <span className="text-[#C82333]">Precisão</span> e
              {" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-yellow-300">Agilidade</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-white/80 mt-5 text-lg"
            >
              Soluções contábeis modernas e personalizadas para pequenas e médias empresas.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                <Shield size={16} /> Conformidade e segurança
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                <Clock size={16} /> Prazos cumpridos
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                <Users size={16} /> Suporte consultivo
              </span>
            </motion.div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => window.open(linkWhatsapp, "_blank")}
                className="px-6 py-3 rounded-xl bg-[#C82333] hover:bg-[#A61B29] transition shadow-lg inline-flex items-center justify-center gap-2"
              >
                Agendar conversa <ArrowRight size={18} />
              </button>
              <a href="#orcamento" className="px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 transition inline-flex items-center justify-center">
                Solicitar orçamento
              </a>
            </div>

            {/* Estatísticas */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-white/70 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mídia/gif/ilustração */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5">
              {/* Substitua por um GIF/loop curto do seu produto/rotina (até 2-4 MB) */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                poster="/hero-poster.jpg"
              >
                <source src="/hero-loop.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#0B1F30] border border-white/10 rounded-2xl p-4 shadow-xl hidden sm:flex items-center gap-3">
              <CheckCircle2 className="text-emerald-400" />
              <span className="text-sm text-white/90">Onboarding em 72h</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BENEFÍCIOS / SOBRE */}
      <section id="sobre" className="py-20 px-6 bg-[#0B1F30] border-t border-white/10">
        <div className="max-w-[1100px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Parceira contábil para crescer com previsibilidade</h2>
            <p className="text-white/80">
              Atuamos lado a lado com sua operação, trazendo clareza, rotina organizada e indicadores que orientam decisões diárias. Menos burocracia, mais resultado.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Planejamento tributário prático",
                "Relatórios que você entende",
                "Rotinas digitais e seguras",
                "Atendimento consultivo",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-white/90">
                  <CheckCircle2 className="text-emerald-400" /> {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 pt-2">
              <div className="flex -space-x-3">
                {["/avatar-1.jpg", "/avatar-2.jpg", "/avatar-3.jpg"].map((a, i) => (
                  <Image key={a} src={a} alt="cliente" width={36} height={36} className={`rounded-full border border-white/20 ${i===0?"":""}`} />
                ))}
              </div>
              <span className="text-white/70 text-sm">+180 empresas confiam na Exactra</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Building2, title: "PMEs e Startups", text: "Processos enxutos com visibilidade do financeiro." },
              { icon: Shield, title: "Compliance", text: "Conformidade fiscal e segurança de dados." },
              { icon: Clock, title: "Agilidade", text: "Rotinas digitais que economizam tempo." },
              { icon: Users, title: "Parceria", text: "Equipe próxima para dúvidas e evolução." },
            ].map((b, idx) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-5 rounded-xl bg-white/5 border border-white/10"
              >
                <b.icon className="mb-3 text-[#C82333]" />
                <div className="font-semibold mb-1">{b.title}</div>
                <div className="text-white/70 text-sm">{b.text}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="py-20 px-6 bg-[#0F253A]">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            Nossos Serviços
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={index}
                className="group bg-[#112C45]/70 backdrop-blur border border-white/10 rounded-xl p-6 shadow-lg hover:-translate-y-1 hover:shadow-2xl transition"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 mx-auto mb-4">
                  <service.icon className="text-[#C82333]" size={28} />
                </div>
                <h3 className="text-xl font-semibold text-center">{service.title}</h3>
                <p className="text-white/70 text-center mt-2">{service.text}</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70 opacity-0 group-hover:opacity-100 transition">
                  <CheckCircle2 size={16} /> Incluso no plano mensal
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESSO (timeline) */}
      <section id="processo" className="py-20 px-6 bg-[#0B1F30] border-y border-white/10">
        <div className="max-w-[1000px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Como funciona</h2>
          <p className="text-white/70 text-center mb-12">Passos simples para colocar sua contabilidade em dia.</p>

          <div className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-white/10 h-full hidden md:block" />
            <div className="grid md:grid-cols-2 gap-8">
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`bg-white/5 border border-white/10 rounded-xl p-6 relative ${
                    i % 2 === 0 ? "md:mr-6" : "md:ml-6"
                  }`}
                >
                  <div className="absolute top-6 md:top-1/2 md:-translate-y-1/2 md:-left-[11px] w-5 h-5 rounded-full bg-[#C82333] border-4 border-[#0B1F30] hidden md:block" />
                  <div className="font-semibold mb-2">{s.title}</div>
                  <p className="text-white/70">{s.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL / DEPOIMENTOS */}
      <section id="depoimentos" className="py-20 px-6 bg-[#0F253A]">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">O que dizem nossos clientes</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <motion.figure
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="relative bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <Quote className="absolute -top-4 -left-4 p-2 w-9 h-9 rounded-full bg-[#C82333]" />
                <div className="flex items-center gap-3 mb-4">
                  <Image src={t.avatar} alt={t.name} width={44} height={44} className="rounded-full border border-white/20" />
                  <div>
                    <div className="font-semibold leading-tight">{t.name}</div>
                    <div className="text-xs text-white/60">{t.role}</div>
                  </div>
                </div>
                <p className="text-white/80">{t.quote}</p>
                <div className="flex gap-1 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* LOGOS / MÍDIA / PARCEIROS */}
      <section className="py-14 px-6 bg-[#0B1F30] border-t border-white/10">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-center text-white/60 mb-6">Aparecemos em</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-70">
            {["/logo-1.svg", "/logo-2.svg", "/logo-3.svg", "/logo-4.svg"].map((logo) => (
              <div key={logo} className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl py-6">
                <Image src={logo} alt="logo" width={120} height={40} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="py-10 px-6 bg-gradient-to-r from-[#C82333]/20 to-[#ffb703]/10 border-y border-white/10">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold">Pronto para organizar sua contabilidade?</h3>
          <div className="flex gap-3">
            <a href="#orcamento" className="px-5 py-3 rounded-xl border border-white/20 hover:border-white/40 transition">Solicitar orçamento</a>
            <button onClick={() => window.open(linkWhatsapp, "_blank")} className="px-5 py-3 rounded-xl bg-[#C82333] hover:bg-[#A61B29] transition shadow-lg inline-flex items-center gap-2">
              Falar no WhatsApp <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ORÇAMENTO (form) */}
      <section id="orcamento" className="py-20 px-6 bg-[#0F253A]">
        <div className="max-w-[900px] mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Solicite um orçamento</h2>
            <p className="text-white/70 mt-3">Responda 3 perguntas e retornamos rapidamente com os próximos passos.</p>
            <ul className="mt-6 space-y-3 text-white/80">
              {["Retorno em até 24h","Dados protegidos","Sem compromisso"].map((b) => (
                <li key={b} className="flex items-center gap-2"><CheckCircle2 className="text-emerald-400" /> {b}</li>
              ))}
            </ul>
          </div>

          <FormOrcamento />
        </div>
      </section>

      {/* LOCALIZAÇÃO */}
      <section id="localizacao" className="py-20 px-6 bg-[#0B1F30] border-y border-white/10">
        <div className="max-w-[1000px] mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2"><MapPin /> Onde estamos</h3>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <iframe
                title="Localização da empresa"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3675.3034780046787!2d-43.182119489840446!3d-22.902174679171736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x997f5ea098bd19%3A0xdfe48b54e7700035!2sR.%20da%20Alf%C3%A2ndega%2C%2080%20-%20Centro%2C%20Rio%20de%20Janeiro%20-%20RJ%2C%2020070-004!5e0!3m2!1spt-BR!2sbr!4v1754055984476!5m2!1spt-BR!2sbr"
                className="w-full h-[360px]"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-2xl font-semibold">Atendimento</h4>
            <p className="text-white/80">Segunda a Sexta • 9h às 18h</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => window.open(linkWhatsapp, "_blank")} className="px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#1fb356] text-black font-semibold inline-flex items-center gap-2">
                WhatsApp
              </button>
              <a href="#contato" className="px-5 py-3 rounded-xl border border-white/20 hover:border-white/40">Formulário</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-[#0F253A]">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Perguntas frequentes</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group bg-white/5 border border-white/10 rounded-xl p-4 open:shadow-lg">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown className="transition group-open:rotate-180" />
                </summary>
                <p className="text-white/70 mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="py-20 px-6 bg-[#0B1F30] border-t border-white/10">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Entre em Contato</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">
            Estamos prontos para ajudar sua empresa a crescer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open(linkWhatsapp, "_blank")}
              className="px-8 py-4 bg-[#25D366] text-black font-bold text-lg rounded-full shadow-lg hover:scale-[1.02] transition inline-flex items-center gap-2"
            >
              Falar no WhatsApp
            </button>
            <a href="#orcamento" className="px-8 py-4 rounded-full border border-white/20 hover:border-white/40 inline-flex items-center gap-2">
              Solicitar orçamento
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#071420] border-t border-white/10">
        <div className="max-w-[1100px] mx-auto px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/trace.svg" alt="Exactra" width={36} height={36} />
              <span className="font-semibold">EXACTRA</span>
            </div>
            <p className="text-white/60 mt-3">Contabilidade moderna para negócios de alta performance.</p>
          </div>
          <div>
            <div className="font-semibold mb-2">Mapa</div>
            <ul className="space-y-1 text-white/70">
              <li><a href="#servicos" className="hover:text-white">Serviços</a></li>
              <li><a href="#sobre" className="hover:text-white">Sobre</a></li>
              <li><a href="#processo" className="hover:text-white">Como funciona</a></li>
              <li><a href="#depoimentos" className="hover:text-white">Depoimentos</a></li>
              <li><a href="#orcamento" className="hover:text-white">Orçamento</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Contato</div>
            <ul className="space-y-1 text-white/70">
              <li>Rio de Janeiro – RJ</li>
              <li>atendimento@exactra.com.br</li>
              <li>(21) 99999-9999</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Redes</div>
            <div className="flex items-center gap-3 text-white/70">
              <a href="#" className="hover:text-white"><Linkedin /></a>
              <a href="#" className="hover:text-white"><Instagram /></a>
              <a href="#" className="hover:text-white"><Facebook /></a>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-white/50 py-5 border-t border-white/10">
          © {new Date().getFullYear()} EXACTRA Contabilidade. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

// --- COMPONENTES --- //

function FormOrcamento() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries());
    console.log("form data", data);
    // Aqui você pode integrar com sua API / serviço de email
    alert("Mensagem enviada! Em breve entraremos em contato.");
    form.reset();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6">
      <input type="hidden" name="_captcha" value="false" />
      <input type="hidden" name="_template" value="box" />

      <Field label="Seu nome">
        <input
          type="text"
          name="nome"
          required
          placeholder="Seu nome"
          className="w-full px-4 py-3 rounded-lg bg-[#112C45] text-white placeholder-gray-400 border border-[#1F3B57] focus:outline-none focus:ring-2 focus:ring-[#C82333]"
        />
      </Field>
      <Field label="Seu e-mail">
        <input
          type="email"
          name="email"
          required
          placeholder="Seu e-mail"
          className="w-full px-4 py-3 rounded-lg bg-[#112C45] text-white placeholder-gray-400 border border-[#1F3B57] focus:outline-none focus:ring-2 focus:ring-[#C82333]"
        />
      </Field>
      <Field label="Mensagem">
        <textarea
          name="mensagem"
          rows={5}
          required
          placeholder="Descreva seu projeto ou dúvida"
          className="w-full px-4 py-3 rounded-lg bg-[#112C45] text-white placeholder-gray-400 border border-[#1F3B57] focus:outline-none focus:ring-2 focus:ring-[#C82333]"
        />
      </Field>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-[#C82333] to-[#A61B29] text-white py-3 rounded-xl font-medium text-lg shadow-lg hover:shadow-red-500/50 transition"
      >
        Enviar Mensagem
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <div className="text-sm text-white/80">{label}</div>
      {children}
    </label>
  );
}