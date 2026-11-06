/**
 * Records the landing's platform videos (apps/web/public/video/plataforma) from the customer area in mock mode.
 * Needs ffmpeg with libx264 (on the PATH or in FFMPEG) and the front running with the mock:
 *   NEXT_PUBLIC_USE_MOCK=true NEXT_PUBLIC_APP_ENV=staging pnpm --filter web exec next dev -p 3100
 *   pnpm --filter e2e platform-videos          # all
 *   pnpm --filter e2e platform-videos guias    # one
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const OUT = fileURLToPath(new URL("../apps/web/public/video/plataforma/", import.meta.url));
const WIDTH = 780; // 390 CSS px at 2x
const HEIGHT = 1520;
// A fixed date keeps the greeting and the months the same on every recording. Before the documents deadline (day 10).
const NOW = new Date("2026-11-05T09:30:00-03:00");
const pdf = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 exemplo") });
const photo = (name) => ({ name, mimeType: "image/jpeg", buffer: Buffer.from("foto de exemplo") });

/** The finger on screen: the mobile emulation has no pointer to show. */
function installFinger() {
  const style = document.createElement("style");
  style.textContent = `
    nextjs-portal, p[role="note"].fixed { display: none !important; }
    #tap-finger { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 38px; height: 38px; margin: -19px 0 0 -19px;
      border-radius: 50%; background: rgba(15,33,51,.34); border: 2px solid rgba(255,255,255,.9); box-shadow: 0 2px 10px rgba(15,33,51,.3);
      pointer-events: none; transition: transform .55s cubic-bezier(.4,0,.2,1), opacity .2s; opacity: 0; }
    #tap-finger.press { background: rgba(200,35,51,.55); }`;
  const add = () => document.documentElement.append(style);
  document.documentElement ? add() : document.addEventListener("readystatechange", add, { once: true });
  window.__finger = (x, y, press) => {
    let dot = document.getElementById("tap-finger");
    if (!dot) {
      dot = document.createElement("div");
      dot.id = "tap-finger";
      dot.style.transform = `translate(${x + 40}px, ${y + 120}px)`;
      document.documentElement.append(dot);
      dot.getBoundingClientRect();
    }
    // A modal <dialog> sits in the top layer: the finger has to live inside it to be seen.
    const host = document.querySelector("dialog[open]") ?? document.documentElement;
    if (dot.parentElement !== host) host.append(dot);
    dot.style.opacity = "1";
    dot.style.transform = `translate(${x}px, ${y}px)${press ? " scale(.72)" : ""}`;
    dot.classList.toggle("press", !!press);
  };
}

function helpers(page) {
  const wait = (ms) => page.waitForTimeout(ms);
  /** Scrolls smoothly until the target is in the middle of the screen. */
  const scrollTo = async (target) => {
    await target.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
    await wait(800);
  };
  /** Moves the finger to the target and presses it. `click: false` only points at it. */
  const tap = async (target, { click = true, scroll = true } = {}) => {
    if (scroll) await scrollTo(target);
    const box = await target.boundingBox();
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.evaluate(([a, b]) => window.__finger(a, b, false), [x, y]);
    await wait(650);
    await page.evaluate(([a, b]) => window.__finger(a, b, true), [x, y]);
    await wait(170);
    if (click) await target.click();
    await page.evaluate(([a, b]) => window.__finger(a, b, false), [x, y]);
    await wait(250);
  };
  /** Taps a button that opens the file picker and answers it with `file`. */
  const attach = async (target, file) => {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), tap(target)]);
    await chooser.setFiles(file);
  };
  return { wait, tap, attach, scrollTo };
}

/** First access, off camera: the other flows start from a company already set up. */
async function finishOnboarding(page) {
  await page.goto(`${BASE_URL}/app/boas-vindas`);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Os dois", { exact: true }).click();
  await page.getByText("Sim", { exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Ir para o início" }).click();
  await page.waitForURL("**/app");
}

/** Gives the mock company a finished previous month, so the month picker has something to show. */
async function addLastMonth(page) {
  await page.evaluate(() => {
    const KEY = "mock-portal-v2";
    const s = JSON.parse(sessionStorage.getItem(KEY));
    const id = "cus_marina";
    const mine = s.requests.filter((r) => r.customerId === id);
    const current = mine.map((r) => r.competence).sort().at(-1);
    const [y, m] = current.split("-").map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    const names = { tpl_extratos: "extrato-itau.pdf", tpl_notas_compra: "notas-de-compra.zip", tpl_folha: "ponto-funcionarios.pdf", tpl_despesas: "aluguel.pdf", tpl_notas_servico: "notas-de-servico.pdf" };
    for (const r of mine.filter((x) => x.competence === current)) {
      const requestId = `${r.id}_prev`;
      s.requests.push({ ...r, id: requestId, competence: prev, status: "SENT" });
      s.files.push({
        id: `fil_${requestId}`, customerId: id, competence: prev, requestId, kind: "DOCUMENT", fileName: names[r.itemId] ?? "documento.pdf",
        contentType: "application/pdf", sizeBytes: 182340, uploadedAt: new Date(Date.now() - 20 * 864e5).toISOString(), uploadedBy: "customer", canDelete: true,
      });
    }
    sessionStorage.setItem(KEY, JSON.stringify(s));
  });
  await page.reload();
}

/** `setup` runs off camera. `poster` is the second of the video used as its still image. */
const flows = {
  "primeiro-acesso": {
    poster: 2.5,
    setup: (page) => page.goto(`${BASE_URL}/app/boas-vindas`),
    ready: (page) => page.getByRole("checkbox"),
    async run(page, { wait, tap, scrollTo }) {
      await wait(1500);
      await tap(page.getByRole("checkbox"));
      await tap(page.getByRole("button", { name: "Continuar" }));
      await wait(1400);
      await tap(page.getByText("Os dois", { exact: true }));
      await wait(300);
      await tap(page.getByText("Sim", { exact: true }));
      await wait(300);
      await tap(page.getByRole("button", { name: "Continuar" }));
      await wait(2000);
      await scrollTo(page.getByRole("button", { name: "Enviar documentos agora" }));
      await wait(2200);
    },
  },
  inicio: {
    poster: 1.5,
    async setup(page) {
      await finishOnboarding(page);
      // The renewal reminder is not what this flow is about.
      await page.evaluate(() => {
        const s = JSON.parse(sessionStorage.getItem("mock-portal-v2"));
        s.customers.find((c) => c.id === "cus_marina").endsAt = new Date(Date.now() + 200 * 864e5).toISOString();
        sessionStorage.setItem("mock-portal-v2", JSON.stringify(s));
      });
      await page.reload();
    },
    ready: (page) => page.getByRole("link", { name: "Ver guia" }).first(),
    async run(page, { wait, tap, scrollTo }) {
      await wait(2200);
      await scrollTo(page.getByRole("link", { name: "Ver documentos" }));
      await wait(1800);
      await scrollTo(page.getByRole("heading", { level: 1 }));
      await wait(600);
      await tap(page.getByRole("link", { name: /Enviar$/ }));
      await page.getByRole("button", { name: "Enviar arquivo" }).first().waitFor();
      await wait(2400);
    },
  },
  documentos: {
    poster: 1,
    async setup(page) {
      await finishOnboarding(page);
      await page.goto(`${BASE_URL}/app/documentos`);
    },
    ready: (page) => page.getByRole("button", { name: "Enviar arquivo" }).first(),
    async run(page, { wait, tap, attach, scrollTo }) {
      await wait(1400);
      await attach(page.getByRole("button", { name: "Enviar arquivo" }).first(), pdf("extrato-itau-outubro.pdf"));
      await page.getByText("extrato-itau-outubro.pdf").waitFor();
      await wait(900);
      // The camera input opens no file chooser in the headless browser: press the button, then hand it the photo.
      await tap(page.getByRole("button", { name: "Tirar foto" }).nth(1), { click: false });
      await page.locator("input[capture]").nth(1).setInputFiles(photo("nota-de-compra.jpg"));
      await page.getByText("nota-de-compra.jpg").waitFor();
      await wait(900);
      await attach(page.getByRole("button", { name: "Enviar arquivo" }).first(), pdf("ponto-funcionarios.pdf"));
      await page.getByText("ponto-funcionarios.pdf").waitFor();
      await wait(800);
      await scrollTo(page.getByRole("heading", { level: 1 }));
      await wait(2600);
    },
  },
  guias: {
    poster: 1,
    async setup(page) {
      await finishOnboarding(page);
      await page.goto(`${BASE_URL}/app/guias`);
    },
    ready: (page) => page.getByRole("button", { name: "Copiar código" }).first(),
    async run(page, { wait, tap, attach }) {
      await wait(1400);
      await tap(page.getByRole("button", { name: "Copiar código" }).first());
      await wait(1500);
      await tap(page.getByRole("button", { name: "Já paguei" }).first());
      await wait(1000);
      await attach(page.locator("dialog[open] button", { hasText: "Anexar comprovante" }), pdf("comprovante-das.pdf"));
      await page.getByText("comprovante-das.pdf").waitFor();
      await wait(800);
      await tap(page.getByRole("button", { name: "Confirmar pagamento" }), { scroll: false });
      await wait(1000);
      await tap(page.getByRole("tab", { name: /Pagas/ }));
      await wait(2600);
    },
  },
  historico: {
    poster: 1,
    async setup(page) {
      await finishOnboarding(page);
      await addLastMonth(page);
      await page.goto(`${BASE_URL}/app/guias`);
      await page.getByRole("tab", { name: /Pagas/ }).click();
    },
    ready: (page) => page.getByRole("button", { name: "Abrir PDF" }).first(),
    async run(page, { wait, tap, scrollTo }) {
      await wait(2000);
      await tap(page.getByRole("button", { name: "Abrir menu" }), { scroll: false });
      await wait(700);
      await tap(page.getByRole("dialog").getByRole("link", { name: "Documentos" }), { scroll: false });
      await page.getByRole("combobox").waitFor();
      await wait(1200);
      const month = page.getByRole("combobox");
      await tap(month, { click: false });
      await month.selectOption({ index: 1 });
      await page.getByText("extrato-itau.pdf").waitFor();
      await wait(1500);
      await scrollTo(page.getByText("extrato-itau.pdf"));
      await wait(1200);
      await tap(page.getByRole("link", { name: /Baixar tudo deste mês/ }), { click: false });
      await wait(2200);
    },
  },
};

async function record(browser, id) {
  const flow = flows[id];
  const context = await browser.newContext({
    viewport: { width: WIDTH / 2, height: HEIGHT / 2 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(() => sessionStorage.setItem("mock-session-user", "cliente@exactra.com.br"));
  await context.addInitScript(installFinger);
  const page = await context.newPage();
  await page.clock.setFixedTime(NOW);
  await flow.setup(page);
  await flow.ready(page).waitFor();
  await page.waitForTimeout(600);

  const dir = mkdtempSync(join(tmpdir(), `video-${id}-`));
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = `${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(join(dir, file), Buffer.from(data, "base64"));
    frames.push({ file, at: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: WIDTH, maxHeight: HEIGHT });
  await page.waitForTimeout(150);

  const start = Date.now();
  await flow.run(page, helpers(page));
  const seconds = (Date.now() - start) / 1000;
  await cdp.send("Page.stopScreencast");
  await context.close();

  // The screencast only sends a frame when the screen changes, so each frame lasts until the next one.
  const end = frames[0].at + seconds;
  const list = frames.flatMap((f, i) => [`file '${f.file}'`, `duration ${Math.max((frames[i + 1]?.at ?? end) - f.at, 0.001).toFixed(3)}`]);
  list.push(`file '${frames.at(-1).file}'`);
  writeFileSync(join(dir, "list.txt"), list.join("\n"));

  mkdirSync(OUT, { recursive: true });
  const mp4 = join(OUT, `${id}.mp4`);
  const filter = `scale=${WIDTH}:${HEIGHT}:flags=lanczos,fps=30,fade=t=in:st=0:d=0.25:c=white,fade=t=out:st=${(seconds - 0.35).toFixed(2)}:d=0.35:c=white,format=yuv420p`;
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-vf", filter, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-movflags", "+faststart", mp4]);
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", String(flow.poster), "-i", mp4, "-frames:v", "1", "-q:v", "4", join(OUT, `${id}.jpg`)]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${id}: ${seconds.toFixed(1)}s, ${frames.length} frames`);
}

const browser = await chromium.launch();
try {
  const asked = process.argv.slice(2);
  for (const id of asked.length ? asked : Object.keys(flows)) await record(browser, id);
} finally {
  await browser.close();
}
