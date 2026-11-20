import { describe, expect, it } from "vitest";
import { formatBRL, formatBRLExact, formatBytes, formatDate, formatDay, formatDayShort, formatDocument } from "./format";

// Intl puts a no-break space after "R$".
const plain = (s: string) => s.replace(/ /g, " ");

describe("money", () => {
  it("whole and exact reais", () => {
    expect(plain(formatBRL(124_049))).toBe("R$ 1.240");
    expect(plain(formatBRLExact(41_250))).toBe("R$ 412,50");
  });
});

describe("dates", () => {
  it("date-only values never shift with the time zone", () => {
    expect(formatDay("2026-11-01")).toBe("01/11/2026");
    expect(formatDay("2026-11-01T00:00:00.000Z")).toBe("01/11/2026");
    expect(formatDayShort("2026-11-01")).toBe("1 nov");
  });
  it("timestamps, or a dash when missing", () => {
    expect(formatDate("2026-10-04T12:00:00Z")).toBe("04/10/2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatBytes", () => {
  it("KB below a megabyte (never 0 KB), MB with a decimal comma", () => {
    expect(formatBytes(830 * 1024)).toBe("830 KB");
    expect(formatBytes(10)).toBe("1 KB");
    expect(formatBytes(1.25 * 1024 * 1024)).toBe("1,3 MB");
  });
});

describe("formatDocument", () => {
  it("formats CPF and CNPJ, including the alphanumeric CNPJ", () => {
    expect(formatDocument("52998224725")).toBe("529.982.247-25");
    expect(formatDocument("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatDocument("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });
  it("leaves anything else as it came", () => {
    expect(formatDocument("123")).toBe("123");
  });
});
