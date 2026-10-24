import { expect, it } from "vitest";
import { contact, phoneLink, whatsappLink } from "./content";

it("WhatsApp link carries the encoded message", () => {
  expect(whatsappLink("Olá! Tudo bem?")).toBe(`https://wa.me/${contact.whatsappNumber}?text=Ol%C3%A1!%20Tudo%20bem%3F`);
  expect(whatsappLink()).toContain(`text=${encodeURIComponent(contact.whatsappText)}`);
});

it("phone link dials the digits with +55", () => {
  expect(phoneLink()).toMatch(/^tel:\+55\d{10,11}$/);
  expect(phoneLink()).toBe(`tel:+55${contact.phone.replace(/\D/g, "")}`);
});
