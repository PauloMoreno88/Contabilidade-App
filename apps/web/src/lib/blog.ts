import fs from "node:fs";
import path from "node:path";
import { blogCategories, type BlogCategoryId } from "@/config/blog";

/**
 * Reads the articles in src/content/blog at build time (static export).
 * The format is a small subset of Markdown, enough for articles:
 *   ## / ### headings, paragraphs, "- " and "1. " lists, "> " notes,
 *   "| a | b |" tables, **bold**, [links](/path) and a [[simulador]] line
 *   that places the simulator call to action.
 */

const DIR = path.join(process.cwd(), "src/content/blog");

export type Inline = string;
export type Block =
  | { type: "h2" | "h3"; text: string; id: string }
  | { type: "p" | "note"; text: Inline }
  | { type: "ul" | "ol"; items: Inline[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "cta" };

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  category: BlogCategoryId;
  date: string;
  updated: string;
  reviewed: boolean;
  readingMinutes: number;
};

export type Faq = { q: string; a: string };
export type Post = PostMeta & { blocks: Block[]; faq: Faq[] };

const FAQ_HEADING = "Perguntas frequentes";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFrontMatter(raw: string, file: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${file}: missing front matter`);
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ["title", "description", "category", "date"]) {
    if (!data[key]) throw new Error(`${file}: front matter "${key}" is required`);
  }
  if (!(data.category in blogCategories)) throw new Error(`${file}: unknown category "${data.category}"`);
  return { data, body: match[2] };
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function parseBody(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (line === "[[simulador]]") {
      blocks.push({ type: "cta" });
      i++;
    } else if (line.startsWith("### ") || line.startsWith("## ")) {
      const level = line.startsWith("### ") ? "h3" : "h2";
      const text = line.replace(/^#+\s+/, "");
      blocks.push({ type: level, text, id: slugify(text) });
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i].trim())) rows.push(cells(lines[i]));
        i++;
      }
      blocks.push({ type: "table", head: rows[0], rows: rows.slice(1) });
    } else if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(- |\d+\. )/, ""));
        i++;
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
    } else if (line.startsWith("> ")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) parts.push(lines[i++].trim().slice(2));
      blocks.push({ type: "note", text: parts.join(" ") });
    } else {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||>|- |\d+\. |\[\[)/.test(lines[i].trim())) parts.push(lines[i++].trim());
      blocks.push({ type: "p", text: parts.join(" ") });
    }
  }
  return blocks;
}

/** Questions under the "Perguntas frequentes" heading: each ### and the paragraph after it. */
function extractFaq(blocks: Block[]): Faq[] {
  const start = blocks.findIndex((b) => b.type === "h2" && b.text === FAQ_HEADING);
  if (start < 0) return [];
  const faq: Faq[] = [];
  for (let i = start + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "h2") break;
    const next = blocks[i + 1];
    if (b.type === "h3" && next?.type === "p") faq.push({ q: b.text, a: stripInline(next.text) });
  }
  return faq;
}

/** Plain text of an inline string (for meta tags and structured data). */
export function stripInline(text: string) {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function readingMinutes(blocks: Block[]) {
  const words = blocks
    .map((b) => ("text" in b ? b.text : "items" in b ? b.items.join(" ") : "rows" in b ? b.rows.flat().join(" ") : ""))
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function load(file: string): Post {
  const { data, body } = parseFrontMatter(fs.readFileSync(path.join(DIR, file), "utf8"), file);
  const blocks = parseBody(body);
  return {
    slug: file.replace(/\.md$/, ""),
    title: data.title,
    description: data.description,
    category: data.category as BlogCategoryId,
    date: data.date,
    updated: data.updated || data.date,
    reviewed: data.reviewed === "sim",
    readingMinutes: readingMinutes(blocks),
    blocks,
    faq: extractFaq(blocks),
  };
}

/** Every article, newest first. */
export function getPosts(): Post[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map(load)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "pt-BR"));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}

/** Same category first, then the newest others. */
export function relatedPosts(post: Post, count = 3): PostMeta[] {
  const others = getPosts().filter((p) => p.slug !== post.slug);
  const same = others.filter((p) => p.category === post.category);
  return [...same, ...others.filter((p) => p.category !== post.category)].slice(0, count).map(toMeta);
}

export function toMeta(post: Post): PostMeta {
  const { slug, title, description, category, date, updated, reviewed, readingMinutes } = post;
  return { slug, title, description, category, date, updated, reviewed, readingMinutes };
}

/** "22 de outubro de 2026" */
export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
