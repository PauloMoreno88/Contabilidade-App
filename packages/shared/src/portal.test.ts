import { describe, expect, it } from "vitest";
import { findBarcodeLines, formatBarcodeLine, mod10, mod11Arrecadacao, mod11Boleto, parseBarcodeLine } from "./barcode";
import {
  addMonthsToCompetence,
  canRenew,
  competenceLabel,
  createGuideSchema,
  createUploadSchema,
  currentDocumentsCompetence,
  customerAccess,
  daysUntil,
  documentsDueDate,
  guideStatus,
  itemApplies,
  retentionDeletionDate,
  uploadContentType,
} from "./portal";

/** Builds a valid 48-digit arrecadação line from the 43 digits around the general check digit. */
function arrecadacao(valueId: "6" | "8", amountCents: number, rest = "03282026123456789012345678901") {
  const check = valueId === "6" ? mod10 : mod11Arrecadacao;
  const body = `8${"1"}${valueId}` + String(amountCents).padStart(11, "0") + rest.slice(0, 29);
  const barcode = body.slice(0, 3) + check(body) + body.slice(3);
  return [0, 1, 2, 3].map((i) => barcode.slice(i * 11, i * 11 + 11)).map((b) => b + check(b)).join("");
}

/** Builds a valid 47-digit boleto line. */
function boleto(amountCents: number) {
  const free = "1234567890123456789012345";
  const body43 = "0019" + "1234" + String(amountCents).padStart(10, "0") + free;
  const dv = mod11Boleto(body43);
  const f1 = "0019" + free.slice(0, 5);
  const f2 = free.slice(5, 15);
  const f3 = free.slice(15, 25);
  return `${f1}${mod10(f1)}${f2}${mod10(f2)}${f3}${mod10(f3)}${dv}1234${String(amountCents).padStart(10, "0")}`;
}

describe("barcode line", () => {
  it("accepts a real Banco do Brasil example boleto", () => {
    const info = parseBarcodeLine("00190.50095 40144.816069 06809.350314 3 37370000000100");
    expect(info).toMatchObject({ kind: "boleto", valid: true, amountCents: 100 });
    expect(info!.barcode).toHaveLength(44);
  });

  it("validates arrecadação lines with mod 10 and mod 11, reading the amount", () => {
    for (const id of ["6", "8"] as const) {
      const line = arrecadacao(id, 123456);
      expect(line).toHaveLength(48);
      expect(parseBarcodeLine(line)).toMatchObject({ kind: "arrecadacao", valid: true, amountCents: 123456 });
    }
  });

  it("rejects a line with one wrong digit", () => {
    const line = arrecadacao("8", 41250);
    for (const pos of [5, 11, 20, 47]) {
      const broken = line.slice(0, pos) + ((Number(line[pos]) + 1) % 10) + line.slice(pos + 1);
      expect(parseBarcodeLine(broken)?.valid).toBe(false);
    }
    const b = boleto(98765);
    expect(parseBarcodeLine(b)?.valid).toBe(true);
    expect(parseBarcodeLine(b.slice(0, 40) + ((Number(b[40]) + 1) % 10) + b.slice(41))?.valid).toBe(false);
  });

  it("ignores separators and wrong lengths", () => {
    const line = arrecadacao("6", 999);
    expect(parseBarcodeLine(formatBarcodeLine(line))?.valid).toBe(true);
    expect(formatBarcodeLine(line)).toMatch(/^\d{11}-\d( \d{11}-\d){3}$/);
    expect(parseBarcodeLine("123")).toBeNull();
  });

  it("finds the line inside extracted PDF text", () => {
    const line = arrecadacao("8", 41250);
    const text = `Documento de Arrecadação do Simples Nacional\nCNPJ 12.345.678/0001-90\nValor Total R$ 412,50\n${formatBarcodeLine(line)}\nPagar até 20/11/2026`;
    expect(findBarcodeLines(text).map((l) => l.line)).toEqual([line]);
  });
});

describe("competence", () => {
  it("does month arithmetic across years", () => {
    expect(addMonthsToCompetence("2026-12", 1)).toBe("2027-01");
    expect(addMonthsToCompetence("2026-01", -1)).toBe("2025-12");
    expect(addMonthsToCompetence("2025-10", 13)).toBe("2026-11");
  });

  it("collects last month's documents, due on the configured day", () => {
    // 04:00Z is 01/11 01:00 in São Paulo; 02:00Z is still 31/10.
    expect(currentDocumentsCompetence(new Date("2026-11-01T04:00:00Z"))).toBe("2026-10");
    expect(currentDocumentsCompetence(new Date("2026-11-01T02:00:00Z"))).toBe("2026-09");
    expect(documentsDueDate("2026-10")).toBe("2026-11-10");
    expect(documentsDueDate("2026-12")).toBe("2027-01-10");
  });

  it("deletes files 12 full months after the competence", () => {
    expect(retentionDeletionDate("2025-10")).toBe("2026-11-01");
  });

  it("labels and counts days in São Paulo time", () => {
    expect(competenceLabel("2026-03")).toBe("março de 2026");
    expect(daysUntil("2026-11-20", new Date("2026-11-17T12:00:00Z"))).toBe(3);
    expect(daysUntil("2026-11-20", new Date("2026-11-21T02:00:00Z"))).toBe(0);
  });
});

describe("access", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const c = (status: "ACTIVE" | "EXPIRED" | "CANCELED" | "PENDING_PAYMENT" | "PAST_DUE", endsAt: string | null, startsAt: string | null = "2025-11-01") => ({
    status,
    startsAt,
    endsAt,
    updatedAt: endsAt ?? "2026-10-01",
  });

  it("is full while a contract is active or past due", () => {
    expect(customerAccess([c("ACTIVE", "2027-01-01")], now)).toMatchObject({ level: "FULL", endsAt: "2027-01-01T00:00:00.000Z" });
    expect(customerAccess([c("PAST_DUE", null)], now).level).toBe("FULL");
  });

  it("is read-only for 90 days after the end, then blocked", () => {
    expect(customerAccess([c("EXPIRED", "2026-10-01")], now).level).toBe("READ_ONLY");
    expect(customerAccess([c("EXPIRED", "2026-07-01")], now).level).toBe("BLOCKED");
  });

  it("does not count contracts that never started", () => {
    expect(customerAccess([c("CANCELED", null, null)], now).level).toBe("BLOCKED");
    expect(customerAccess([c("PENDING_PAYMENT", null, null)], now).level).toBe("PENDING");
  });

  it("opens renewal 60 days before the end", () => {
    expect(canRenew(customerAccess([c("ACTIVE", "2026-12-15")], now), now)).toBe(true);
    expect(canRenew(customerAccess([c("ACTIVE", "2027-06-01")], now), now)).toBe(false);
    expect(canRenew(customerAccess([c("EXPIRED", "2026-10-01")], now), now)).toBe(true);
  });
});

describe("guides and documents", () => {
  it("computes the guide status from the due date in São Paulo", () => {
    const now = new Date("2026-11-21T02:00:00Z"); // still 20/11 in São Paulo
    expect(guideStatus({ paidAt: null, dueDate: "2026-11-20" }, now)).toBe("OPEN");
    expect(guideStatus({ paidAt: null, dueDate: "2026-11-19" }, now)).toBe("OVERDUE");
    expect(guideStatus({ paidAt: "2026-11-19T10:00:00Z", dueDate: "2026-11-19" }, now)).toBe("PAID");
  });

  it("refuses a guide whose amount differs from the line", () => {
    const base = { customerId: "c", fileId: "f", type: "DAS", competence: "2026-10", dueDate: "2026-11-20" } as const;
    const line = arrecadacao("8", 41250);
    expect(createGuideSchema.safeParse({ ...base, amountCents: 41250, barcode: line }).success).toBe(true);
    expect(createGuideSchema.safeParse({ ...base, amountCents: 41251, barcode: line }).success).toBe(false);
    expect(createGuideSchema.safeParse({ ...base, amountCents: 41250, barcode: "8" + line.slice(1, 47) }).success).toBe(false);
    expect(createGuideSchema.safeParse({ ...base, amountCents: 41250 }).success).toBe(true);
  });

  it("takes the content type from the extension and refuses unknown types", () => {
    expect(uploadContentType("Extrato Outubro.PDF")).toBe("application/pdf");
    expect(uploadContentType("foto.heic")).toBe("image/heic");
    expect(uploadContentType("site.html")).toBeNull();
    expect(createUploadSchema.safeParse({ purpose: "document", fileName: "a.exe", sizeBytes: 10 }).success).toBe(false);
    expect(createUploadSchema.safeParse({ purpose: "document", fileName: "a.pdf", sizeBytes: 26 * 1024 * 1024 }).success).toBe(false);
  });

  it("applies checklist items by profile", () => {
    const servicos = { activity: "servicos" as const, hasEmployees: false, banks: [] };
    expect(itemApplies({}, servicos)).toBe(true);
    expect(itemApplies({ hasEmployees: true }, servicos)).toBe(false);
    expect(itemApplies({ activities: ["comercio", "ambos"] }, servicos)).toBe(false);
    expect(itemApplies({ activities: ["servicos"] }, servicos)).toBe(true);
    expect(itemApplies({ hasEmployees: true }, null)).toBe(false);
    expect(itemApplies({}, null)).toBe(true);
  });
});
