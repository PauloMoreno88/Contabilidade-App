import { describe, expect, it } from "vitest";
import { createManualCustomerSchema } from "./portal-admin";
import { createCheckoutSchema } from "./schemas";
import { isValidCnpj, isValidCpf, isValidTaxId, normalizeTaxId } from "./tax-id";

describe("CPF", () => {
  it("accepts valid check digits, with or without punctuation", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("rejects wrong check digits, repeated digits and wrong lengths", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("5299822472")).toBe(false);
  });
});

describe("CNPJ", () => {
  it("accepts numeric and alphanumeric CNPJs", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(isValidCnpj("12abc34501de35")).toBe(true);
  });
  it("rejects wrong check digits and repeated digits", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("12.ABC.345/01DE-36")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
  });
});

it("normalizes to letters and digits in upper case", () => {
  expect(normalizeTaxId("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  expect(isValidTaxId("123")).toBe(false);
});

it("checkout and manual customer refuse an invalid CPF", () => {
  const checkout = {
    plan: "exactra",
    period: "ANNUAL",
    method: "CARD",
    customer: { name: "Fulano", email: "f@x.com", phone: "21987654321", document: "11111111111" },
    consent: true,
  };
  expect(createCheckoutSchema.safeParse(checkout).success).toBe(false);
  expect(createCheckoutSchema.safeParse({ ...checkout, customer: { ...checkout.customer, document: "52998224725" } }).success).toBe(true);

  const manual = { name: "Fulano", email: "f@x.com", phone: "21987654321", startsAt: "2026-01-01", endsAt: "2027-01-01" };
  expect(createManualCustomerSchema.safeParse({ ...manual, document: "111.111.111-11" }).success).toBe(false);
  expect(createManualCustomerSchema.safeParse({ ...manual, document: "529.982.247-25" }).success).toBe(true);
});
