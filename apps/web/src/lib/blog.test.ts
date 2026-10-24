import { describe, expect, it } from "vitest";
import { blogCategories } from "@/config/blog";
import { extractFaq, getPosts, parseBody, parseFrontMatter, relatedPosts, stripInline } from "./blog";

const front = (fields: string) => `---\n${fields}\n---\nTexto.\n`;

describe("front matter", () => {
  it("reads the fields", () => {
    const { data, body } = parseFrontMatter(front("title: Título: com dois pontos\ndescription: D\ncategory: impostos\ndate: 2026-10-22"), "a.md");
    expect(data).toMatchObject({ title: "Título: com dois pontos", category: "impostos", date: "2026-10-22" });
    expect(body).toBe("Texto.\n");
  });
  it("refuses a missing field, an unknown category or no front matter", () => {
    expect(() => parseFrontMatter(front("title: T\ncategory: impostos\ndate: 2026-10-22"), "a.md")).toThrow('a.md: front matter "description" is required');
    expect(() => parseFrontMatter(front("title: T\ndescription: D\ncategory: outra\ndate: 2026-10-22"), "a.md")).toThrow('unknown category "outra"');
    expect(() => parseFrontMatter("Só texto", "a.md")).toThrow("a.md: missing front matter");
  });
});

describe("body", () => {
  it("parses every block type", () => {
    const blocks = parseBody(
      [
        "## Quanto custa abrir",
        "Primeira linha",
        "continua o parágrafo.",
        "",
        "- um",
        "- dois",
        "1. primeiro",
        "> nota",
        "> continua",
        "| Regime | Imposto |",
        "|---|---|",
        "| MEI | R$ 76 |",
        "[[simulador]]",
        "### Ação é útil?",
      ].join("\n"),
    );
    expect(blocks).toEqual([
      { type: "h2", text: "Quanto custa abrir", id: "quanto-custa-abrir" },
      { type: "p", text: "Primeira linha continua o parágrafo." },
      { type: "ul", items: ["um", "dois", "primeiro"] },
      { type: "note", text: "nota continua" },
      { type: "table", head: ["Regime", "Imposto"], rows: [["MEI", "R$ 76"]] },
      { type: "cta" },
      { type: "h3", text: "Ação é útil?", id: "acao-e-util" },
    ]);
  });

  it("FAQ: each ### under 'Perguntas frequentes' and its paragraph, until the next ##", () => {
    const blocks = parseBody("## Perguntas frequentes\n### Pergunta?\nResposta com **negrito** e [link](/x).\n### Sem resposta\n## Outra seção\n### Fora?\nNão entra.");
    expect(extractFaq(blocks)).toEqual([{ q: "Pergunta?", a: "Resposta com negrito e link." }]);
    expect(extractFaq(parseBody("## Outra\n### P?\nR."))).toEqual([]);
  });

  it("stripInline removes bold and links", () => {
    expect(stripInline("**Fator R** e [simulador](/#simulador)")).toBe("Fator R e simulador");
  });
});

// The real articles in src/content/blog: a broken one would only show up in the build.
describe("articles", () => {
  const posts = getPosts();

  it("all load, newest first, with known categories and unique slugs", () => {
    expect(posts.length).toBeGreaterThan(0);
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    for (const p of posts) {
      expect(p.category in blogCategories, p.slug).toBe(true);
      expect(p.date, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.readingMinutes, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.blocks.length, p.slug).toBeGreaterThan(0);
    }
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("every image has an alt text", () => {
    for (const p of posts.filter((p) => p.image)) expect(p.imageAlt, p.slug).not.toBe("");
  });

  it("related posts never include the article itself and prefer the same category", () => {
    const post = posts[0];
    const related = relatedPosts(post);
    expect(related.map((r) => r.slug)).not.toContain(post.slug);
    const sameCount = posts.filter((p) => p.slug !== post.slug && p.category === post.category).length;
    expect(related.slice(0, Math.min(sameCount, 3)).every((r) => r.category === post.category)).toBe(true);
  });
});
