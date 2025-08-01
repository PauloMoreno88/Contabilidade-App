'use client';

import { Mail, Phone, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import Image from "next/image";

export default function ExactraWebsite() {
    const numero = "5521992635721";
    const mensagem = "Olá, gostaria de um orçamento.";
    const email = "contato@exactracontabilidade.com.br"
    const linkWhatsapp = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);

        const res = await fetch(`https://formsubmit.co/${email}`, {
            method: "POST",
            body: data,
        });

        if (res.ok) {
            toast.success("Mensagem enviada com sucesso!");
            form.reset();
        } else {
            toast.error("Ocorreu um erro. Tente novamente.");
        }
    };
    return (
        <div className="min-h-screen bg-[#0A1B2A] text-white font-sans scroll-smooth">
            <motion.header
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center justify-between p-6 max-w-[1536px] mx-auto sm:flex-row"
            >
                <div className="text-3xl font-bold text-white flex items-center gap-2">
                    <span className="text-[#C82333] text-4xl">
                        <Image src={'/trace.svg'} alt='logo' width={80} height={80} />
                    </span>
                </div>
                <nav className="space-x-6 flex flex-col gap-2 items-center sm:flex sm:flex-row sm:justify-center sm:gap-5">
                    <a href="#servicos" className="hover:text-[#C82333] mt-3 mr-0 sm:mt-0">Serviços</a>
                    <a href="#contato" className="hover:text-[#C82333]">Contato</a>
                </nav>
            </motion.header>

            <motion.section
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center py-24 px-4 flex flex-col items-center bg-[#0F253A] gap-5"
            >
                <Image src={'/trace.svg'} alt='logo' width={200} height={200} />

                <h1 className="text-4xl md:text-6xl font-bold">Contabilidade com Precisão e Agilidade</h1>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                    Soluções contábeis modernas e personalizadas para pequenas e médias empresas.
                </p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.open(linkWhatsapp, "_blank")}
                    className="bg-[#C82333] hover:bg-[#A61B29] hover:cursor-pointer text-white px-6 py-3 rounded-xl text-lg"
                >
                    Fale Conosco
                </motion.button>
            </motion.section>

            <section id="servicos" className="py-20 px-6 bg-[#0F253A]">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-3xl font-semibold text-center mb-12"
                >
                    Nossos Serviços
                </motion.h2>
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {[{
                        icon: Briefcase,
                        title: "Contabilidade Empresarial",
                        text: "Gestão contábil completa e estratégica para sua empresa crescer com segurança."
                    }, {
                        icon: Mail,
                        title: "Fiscal e Tributário",
                        text: "Cumprimento das obrigações fiscais com planejamento tributário eficiente."
                    }, {
                        icon: Phone,
                        title: "Consultoria Contábil",
                        text: "Suporte e análise para tomadas de decisão precisas e baseadas em dados."
                    }].map((service, index) => (
                        <motion.div
                            key={index}
                            className="bg-[#112C45] border-none rounded-lg"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                        >
                            <div className="p-6 text-center">
                                <service.icon className="mx-auto mb-4 text-[#C82333]" size={60} />
                                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                                <p className="text-gray-300 text-sm">{service.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>
            <motion.section
                id="orcamento"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="py-20 px-6 bg-[#0F253A]"
            >
                <div className="max-w-xl mx-auto text-center">
                    <h2 className="text-3xl font-semibold mb-6">Solicite um Orçamento</h2>
                    <p className="text-gray-300 mb-10">
                        Envie seus dados e entraremos em contato rapidamente.
                    </p>
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <input type="hidden" name="_captcha" value="false" />
                        <input type="hidden" name="_template" value="box" />
                        <motion.input
                            type="text"
                            name="nome"
                            placeholder="Seu nome"
                            required
                            whileFocus={{ scale: 1.02 }}
                            className="w-full px-4 py-3 rounded-lg bg-[#112C45] text-white placeholder-gray-400 border border-[#1F3B57] focus:outline-none focus:ring-2 focus:ring-[#C82333]"
                        />
                        <motion.input
                            type="email"
                            name="email"
                            placeholder="Seu e-mail"
                            required
                            whileFocus={{ scale: 1.02 }}
                            className="w-full px-4 py-3 rounded-lg bg-[#112C45] text-white placeholder-gray-400 border border-[#1F3B57] focus:outline-none focus:ring-2 focus:ring-[#C82333]"
                        />
                        <motion.textarea
                            name="mensagem"
                            placeholder="Descreva seu projeto ou dúvida"
                            rows={5}
                            required
                            whileFocus={{ scale: 1.02 }}
                            className="w-full px-4 py-3 rounded-lg bg-[#112C45] text-white placeholder-gray-400 border border-[#1F3B57] focus:outline-none focus:ring-2 focus:ring-[#C82333]"
                        />
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full bg-[#C82333] hover:cursor-pointer hover:bg-[#A61B29] text-white py-3 rounded-xl font-medium text-lg transition-all"
                        >
                            Enviar Mensagem
                        </motion.button>
                    </form>

                </div>
            </motion.section>
            <motion.section
                id="contato"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="py-20 px-6 text-center"
            >
                <h2 className="text-3xl font-semibold mb-6">Entre em Contato</h2>
                <p className="text-gray-300 mb-6">
                    Estamos prontos para ajudar sua empresa a crescer.
                </p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.open(linkWhatsapp, "_blank")}
                    className="bg-[#C82333] hover:cursor-pointer hover:bg-[#A61B29] text-white px-6 py-3 rounded-xl text-lg"
                >
                    WhatsApp
                </motion.button>
            </motion.section>
            <footer className="text-center py-6 border-t border-gray-700 text-sm text-gray-400">
                © {new Date().getFullYear()} EXACTRA Contabilidade. Todos os direitos reservados.
            </footer>
        </div>
    );
}