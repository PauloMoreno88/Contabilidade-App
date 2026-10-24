import {
  canRenew,
  checklistAppliesToSchema,
  createGuideSchema,
  createUploadSchema,
  currentDocumentsCompetence,
  customerAccess,
  documentsDueDate,
  guideStatus,
  addMonthsToCompetence,
  itemApplies,
  itemStarted,
  retentionDeletionDate,
  todayInSaoPaulo,
  uploadContentType,
  type AdminCustomerDetail,
  type AdminMonthRow,
  type ChecklistItem,
  type CompanyProfile,
  type CreateGuideInput,
  type CreateManualCustomerInput,
  type CreateUploadInput,
  type DocumentRequest,
  type DocumentsMonth,
  type GuideType,
  type PortalFile,
  type PortalGuide,
  type PortalTask,
  type RejectionReason,
  type UpdateCustomerInput,
  type UploadTicket,
  type UpsertChecklistItemInput,
} from "@exactra/shared";
import { ApiError, type portalHttpApi } from "./http";

/**
 * In-browser stand-in for the customer area routes (NEXT_PUBLIC_USE_MOCK=true).
 * One company ("Estúdio Marina Costa") plus a few others for the admin screens.
 * State lives in sessionStorage so a reload keeps uploads and "Já paguei".
 */

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const day = (offsetDays: number) => todayInSaoPaulo(new Date(Date.now() + offsetDays * DAY));

type MockFile = PortalFile & { customerId: string; competence: string; requestId: string | null; kind: "DOCUMENT" | "GUIDE" | "RECEIPT" };
type MockRequest = Omit<DocumentRequest, "files"> & { customerId: string; itemId: string };
type MockGuide = Omit<PortalGuide, "status" | "file" | "receipt"> & { customerId: string; fileId: string; receiptFileId: string | null };
type MockCustomer = {
  id: string; name: string; email: string; phone: string; document: string; createdAt: string;
  profile: CompanyProfile | null; onboardedAt: string | null; remindersEnabled: boolean; disabledItemIds: string[];
  endsAt: string; startsAt: string; hasLogin: boolean; lastSeenAt: string | null;
};
type State = { customers: MockCustomer[]; items: ChecklistItem[]; requests: MockRequest[]; files: MockFile[]; guides: MockGuide[] };

const KEY = "mock-portal-v2";
export const MOCK_CUSTOMER_ID = "cus_marina";

function seed(): State {
  const comp = currentDocumentsCompetence();
  const prev = addMonthsToCompetence(comp, -1);
  const items: ChecklistItem[] = [
    { id: "tpl_extratos", title: "Extratos bancários", description: "Extrato do mês inteiro de cada conta da empresa, em PDF ou OFX.", required: true, appliesTo: {}, active: true, sortOrder: 10, customerId: null, startsCompetence: null },
    { id: "tpl_notas_servico", title: "Notas fiscais de serviço emitidas", description: "Se emitiu nota fora do sistema da prefeitura que acompanhamos, envie o PDF ou o XML.", required: false, appliesTo: { activities: ["servicos", "ambos"] }, active: true, sortOrder: 20, customerId: null, startsCompetence: null },
    { id: "tpl_notas_compra", title: "Notas fiscais de compra", description: "XML ou PDF das notas de mercadorias e insumos comprados no mês.", required: true, appliesTo: { activities: ["comercio", "ambos"] }, active: true, sortOrder: 30, customerId: null, startsCompetence: null },
    { id: "tpl_folha", title: "Ponto e ocorrências dos funcionários", description: "Folha de ponto, faltas, horas extras, férias, admissões e desligamentos do mês.", required: true, appliesTo: { hasEmployees: true }, active: true, sortOrder: 40, customerId: null, startsCompetence: null },
    { id: "tpl_despesas", title: "Comprovantes de despesas", description: "Aluguel, contas e outras despesas pagas pela empresa. Ajuda a fechar o mês com mais precisão.", required: false, appliesTo: {}, active: true, sortOrder: 50, customerId: null, startsCompetence: null },
  ];
  const names = ["Estúdio Marina Costa", "Padaria Sol Nascente", "Rocha Engenharia", "Clínica Prado", "Nunes Tecnologia", "Ateliê Reis"];
  const customers: MockCustomer[] = names.map((name, i) => ({
    id: i === 0 ? MOCK_CUSTOMER_ID : `cus_${i}`,
    name,
    email: i === 0 ? "cliente@exactra.com.br" : `contato${i}@exemplo.com.br`,
    phone: "21988887777",
    document: ["12345678000190", "98765432000110", "11222333000144", "55666777000188", "22333444000155", "12312312300"][i],
    createdAt: iso(-200 + i * 20),
    profile: i === 0 ? null : { activity: (["servicos", "comercio", "ambos"] as const)[i % 3], hasEmployees: i % 2 === 0, banks: ["Itaú"] },
    onboardedAt: i === 0 ? null : iso(-150),
    remindersEnabled: true,
    disabledItemIds: [],
    startsAt: iso(-300 + i * 10),
    endsAt: iso(i === 0 ? 45 : 200 - i * 30),
    hasLogin: i !== 4,
    lastSeenAt: i === 4 ? null : iso(-i),
  }));
  const s: State = { customers, items, requests: [], files: [], guides: [] };
  for (const c of customers) ensure(s, c, comp);
  // Some history for the admin overview and the documents month picker.
  for (const c of customers.slice(1)) {
    ensure(s, c, prev);
    s.requests.filter((r) => r.customerId === c.id).forEach((r, i) => (r.status = i % 4 === 3 ? "PENDING" : "SENT"));
  }
  const r2 = s.requests.find((r) => r.customerId === "cus_2" && r.competence === comp);
  if (r2) Object.assign(r2, { status: "REJECTED", rejection: { reason: "illegible", note: null, at: iso(-1) } });

  const guide = (customerId: string, type: GuideType, amountCents: number, dueOffset: number, paid: boolean, competence = comp, label: string | null = null) => {
    const fileId = uid("fil");
    s.files.push({ id: fileId, customerId, competence, requestId: null, kind: "GUIDE", fileName: `${type}-${competence}.pdf`, contentType: "application/pdf", sizeBytes: 81234, uploadedAt: iso(-3), uploadedBy: "exactra", canDelete: false });
    s.guides.push({
      id: uid("gde"), customerId, fileId, receiptFileId: null, type, label, competence, amountCents, dueDate: day(dueOffset),
      barcode: type === "DAS" ? "858200000041125003282026612345678901234567890123".slice(0, 48) : null,
      paidAt: paid ? iso(dueOffset - 2) : null, publishedAt: iso(-3),
    });
  };
  guide(MOCK_CUSTOMER_ID, "DAS", 41250, 3, false);
  guide(MOCK_CUSTOMER_ID, "ISS", 18990, 12, false, comp, "ISS de serviços – Niterói");
  guide(MOCK_CUSTOMER_ID, "DAS", 39870, -27, true, prev);
  guide(MOCK_CUSTOMER_ID, "FGTS", 22100, -25, true, prev);
  guide("cus_2", "DAS", 128400, -4, false);
  guide("cus_3", "DARF", 54320, 6, false);
  return s;
}

function ensure(s: State, c: MockCustomer, competence: string) {
  for (const item of s.items) {
    if (!item.active || !itemStarted(item.startsCompetence, competence) || (item.customerId && item.customerId !== c.id) || c.disabledItemIds.includes(item.id)) continue;
    if (!item.customerId && !itemApplies(checklistAppliesToSchema.parse(item.appliesTo), c.profile)) continue;
    if (s.requests.some((r) => r.customerId === c.id && r.competence === competence && r.itemId === item.id)) continue;
    s.requests.push({
      id: uid("req"), customerId: c.id, itemId: item.id, competence, title: item.title, description: item.description,
      required: item.required, dueDate: documentsDueDate(competence), status: "PENDING", rejection: null,
    });
  }
}

/** "Agora": items started in the open competence reach the companies whose month already exists. */
function addToOpenMonth(s: State) {
  const comp = currentDocumentsCompetence();
  for (const c of s.customers) if (s.requests.some((r) => r.customerId === c.id && r.competence === comp)) ensure(s, c, comp);
}

let cache: State | null = null;
function state(): State {
  if (cache) return cache;
  try {
    const raw = sessionStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as State) : seed();
    if (!raw) sessionStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    cache = seed();
  }
  return cache;
}
function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state()));
  } catch {
    // private mode: state lives until reload
  }
}

const customer = (id = MOCK_CUSTOMER_ID) => {
  const c = state().customers.find((x) => x.id === id);
  if (!c) throw new ApiError(404, "Not Found");
  return c;
};
const contractsOf = (c: MockCustomer) => [{ status: Date.parse(c.endsAt) > Date.now() ? ("ACTIVE" as const) : ("EXPIRED" as const), startsAt: c.startsAt, endsAt: c.endsAt, updatedAt: c.endsAt }];
const accessOf = (c: MockCustomer) => customerAccess(contractsOf(c));
const fileView = (f: MockFile, writable: boolean): PortalFile => ({
  ...f,
  canDelete: writable && f.uploadedBy === "customer" && f.kind !== "GUIDE" && f.competence >= currentDocumentsCompetence(),
});
const guideView = (g: MockGuide): PortalGuide => {
  const s = state();
  const file = s.files.find((f) => f.id === g.fileId)!;
  const receipt = g.receiptFileId ? s.files.find((f) => f.id === g.receiptFileId) : null;
  return {
    id: g.id, type: g.type, label: g.label, competence: g.competence, amountCents: g.amountCents, dueDate: g.dueDate, barcode: g.barcode,
    paidAt: g.paidAt, publishedAt: g.publishedAt, status: guideStatus(g), file: fileView(file, false), receipt: receipt ? fileView(receipt, false) : null,
  };
};

/** Drops the mock-only fields before returning a request. */
const omitOwner = (r: MockRequest): Omit<DocumentRequest, "files"> => {
  const { customerId, itemId, ...rest } = r;
  void customerId;
  void itemId;
  return rest;
};

function month(c: MockCustomer, competence: string | undefined, writable: boolean): DocumentsMonth {
  const s = state();
  const current = currentDocumentsCompetence();
  const m = competence ?? current;
  if (m === current) ensure(s, c, m);
  const files = s.files.filter((f) => f.customerId === c.id && f.kind === "DOCUMENT" && f.competence === m);
  const comps = new Set([current, ...s.requests.filter((r) => r.customerId === c.id).map((r) => r.competence)]);
  return {
    competence: m,
    dueDate: documentsDueDate(m),
    requests: s.requests
      .filter((r) => r.customerId === c.id && r.competence === m)
      .sort((a, b) => Number(b.required) - Number(a.required))
      .map((r) => ({ ...omitOwner(r), files: files.filter((f) => f.requestId === r.id).map((f) => fileView(f, writable)) })),
    others: files.filter((f) => !f.requestId).map((f) => fileView(f, writable)),
    competences: [...comps].sort().reverse(),
    deletesOn: retentionDeletionDate(m),
  };
}

/** Pending upload tickets: the mock "storage" only remembers what was announced. */
const tickets = new Map<string, MockFile>();

function createTicket(input: CreateUploadInput, customerId: string, byStaff: boolean): UploadTicket {
  const s = state();
  createUploadSchema.parse(input);
  const req = input.requestId ? s.requests.find((r) => r.id === input.requestId && r.customerId === customerId) : null;
  const guide = input.guideId ? s.guides.find((g) => g.id === input.guideId) : null;
  const competence = req?.competence ?? guide?.competence ?? input.competence ?? currentDocumentsCompetence();
  const id = uid("fil");
  tickets.set(id, {
    id, customerId, competence, requestId: req?.id ?? null,
    kind: input.purpose === "guide" ? "GUIDE" : input.purpose === "receipt" ? "RECEIPT" : "DOCUMENT",
    fileName: input.fileName, contentType: uploadContentType(input.fileName)!, sizeBytes: input.sizeBytes,
    uploadedAt: new Date().toISOString(), uploadedBy: byStaff ? "exactra" : "customer", canDelete: false,
  });
  return { fileId: id, url: `${window.location.origin}/mock-upload/${id}`, method: "PUT", headers: {} };
}

function complete(fileId: string): PortalFile {
  const s = state();
  const f = tickets.get(fileId) ?? s.files.find((x) => x.id === fileId);
  if (!f) throw new ApiError(404, "Not Found");
  if (!s.files.includes(f)) s.files.push(f);
  tickets.delete(fileId);
  const req = f.requestId ? s.requests.find((r) => r.id === f.requestId) : null;
  if (req) Object.assign(req, { status: "SENT", rejection: null });
  save();
  return fileView(f, true);
}

/** Shows a small sample file instead of the real document. */
const sampleUrl = (f: MockFile) => `data:text/plain;charset=utf-8,${encodeURIComponent(`Arquivo de exemplo (modo mock): ${f.fileName}`)}`;

function tasksFor(c: MockCustomer): PortalTask[] {
  const s = state();
  const comp = currentDocumentsCompetence();
  ensure(s, c, comp);
  const tasks: [number, PortalTask][] = [];
  if (!c.onboardedAt) tasks.push([0, { kind: "onboarding" }]);
  for (const g of s.guides.filter((x) => x.customerId === c.id && !x.paidAt)) {
    const st = guideStatus(g);
    tasks.push([st === "OVERDUE" ? 1 : 3, { kind: "guide", guideId: g.id, type: g.type, label: g.label, amountCents: g.amountCents, dueDate: g.dueDate, status: st === "OVERDUE" ? "OVERDUE" : "OPEN" }]);
  }
  for (const r of s.requests.filter((x) => x.customerId === c.id && x.status === "REJECTED")) {
    tasks.push([2, { kind: "rejected", requestId: r.id, competence: r.competence, title: r.title, reason: (r.rejection?.reason ?? "other") as RejectionReason }]);
  }
  const req = s.requests.filter((r) => r.customerId === c.id && r.competence === comp && r.required);
  const pending = req.filter((r) => r.status !== "SENT").length;
  if (pending) tasks.push([5, { kind: "documents", competence: comp, pending, total: req.length, dueDate: documentsDueDate(comp) }]);
  if (canRenew(accessOf(c))) tasks.push([4, { kind: "renew", endsAt: c.endsAt }]);
  return tasks.sort((a, b) => a[0] - b[0]).map(([, t]) => t);
}

type PortalApi = typeof portalHttpApi;

export const mockPortalApi: PortalApi = {
  async inviteInfo(token) {
    await delay();
    if (token !== "convite-teste") throw new ApiError(400, "Este link expirou ou já foi usado. Peça um novo pelo WhatsApp.");
    return { email: "cliente@exactra.com.br", name: "Marina Costa", companyName: "Estúdio Marina Costa" };
  },
  async activateAccount() {
    await delay();
    return {};
  },

  async me() {
    await delay(150);
    const c = customer();
    return {
      user: { id: "usr_cliente", name: "Marina Costa", email: c.email, twoFactorEnabled: false },
      company: { id: c.id, name: c.name, document: c.document, email: c.email, phone: c.phone },
      access: accessOf(c),
      onboarded: Boolean(c.onboardedAt),
    };
  },
  async onboarding(input) {
    await delay();
    const c = customer();
    Object.assign(c, { phone: input.phone, profile: input.profile ?? c.profile, onboardedAt: c.onboardedAt ?? new Date().toISOString() });
    // Rebuild the current month from the profile.
    const s = state();
    s.requests = s.requests.filter((r) => !(r.customerId === c.id && r.competence === currentDocumentsCompetence() && r.status === "PENDING"));
    ensure(s, c, currentDocumentsCompetence());
    save();
    return {};
  },
  async home() {
    await delay();
    const c = customer();
    const s = state();
    const comp = currentDocumentsCompetence();
    const tasks = tasksFor(c);
    const req = s.requests.filter((r) => r.customerId === c.id && r.competence === comp && r.required);
    const open = s.guides.filter((g) => g.customerId === c.id && !g.paidAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    save();
    return {
      tasks,
      documents: { competence: comp, sent: req.filter((r) => r.status === "SENT").length, total: req.length, dueDate: documentsDueDate(comp) },
      guides: { open: open.length, openAmountCents: open.reduce((t, g) => t + g.amountCents, 0), nextDueDate: open[0]?.dueDate ?? null },
      recentGuides: s.guides.filter((g) => g.customerId === c.id).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3).map(guideView),
    };
  },
  async documents(competence) {
    await delay();
    const r = month(customer(), competence, true);
    save();
    return r;
  },
  async createUpload(input) {
    await delay(150);
    return createTicket(input, MOCK_CUSTOMER_ID, false);
  },
  async completeUpload(fileId) {
    await delay(150);
    return complete(fileId);
  },
  async deleteFile(fileId) {
    await delay();
    const s = state();
    const f = s.files.find((x) => x.id === fileId);
    if (!f) throw new ApiError(404, "Not Found");
    s.files = s.files.filter((x) => x !== f);
    if (f.requestId && !s.files.some((x) => x.requestId === f.requestId)) {
      const r = s.requests.find((x) => x.id === f.requestId);
      if (r) r.status = "PENDING";
    }
    save();
  },
  async fileUrl(fileId) {
    await delay(100);
    const f = state().files.find((x) => x.id === fileId);
    if (!f) throw new ApiError(404, "Not Found");
    return { url: sampleUrl(f) };
  },
  zipUrl: () => `data:text/plain;charset=utf-8,${encodeURIComponent("ZIP de exemplo (modo mock)")}`,
  async guides() {
    await delay();
    const all = state().guides.filter((g) => g.customerId === MOCK_CUSTOMER_ID).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(guideView);
    return { open: all.filter((g) => g.status !== "PAID"), paid: all.filter((g) => g.status === "PAID").reverse() };
  },
  async markGuidePaid(id, input) {
    await delay();
    const g = state().guides.find((x) => x.id === id);
    if (!g) throw new ApiError(404, "Not Found");
    Object.assign(g, { paidAt: g.paidAt ?? new Date().toISOString(), receiptFileId: input.receiptFileId ?? g.receiptFileId });
    save();
    return guideView(g);
  },
  async unmarkGuidePaid(id) {
    await delay();
    const g = state().guides.find((x) => x.id === id)!;
    g.paidAt = null;
    save();
    return guideView(g);
  },
  async plan() {
    await delay();
    const c = customer();
    const access = accessOf(c);
    return {
      access,
      canRenew: canRenew(access),
      contracts: [
        {
          id: "ctr_1", plan: "exactra", period: "ANNUAL", method: "PIX", amountCents: 358800, status: "ACTIVE", source: "CHECKOUT",
          startsAt: c.startsAt, endsAt: c.endsAt, createdAt: c.startsAt,
          payments: [{ id: "pay_1", amountCents: 358800, method: "PIX", status: "PAID", paidAt: c.startsAt, createdAt: c.startsAt }],
        },
      ],
    };
  },
  async renew() {
    await delay(600);
    return { checkoutUrl: `${window.location.origin}/checkout/status?contract=mock&token=mock`, contractId: "mock", statusToken: "mock" };
  },
  async company() {
    await delay();
    const c = customer();
    return {
      id: c.id, name: c.name, document: c.document, email: c.email, phone: c.phone, profile: c.profile, remindersEnabled: c.remindersEnabled,
      members: [{ name: "Marina Costa", email: c.email, role: "OWNER", you: true }],
    };
  },
  async updateCompany(input) {
    await delay();
    const c = customer();
    Object.assign(c, { phone: input.phone ?? c.phone, profile: input.profile ?? c.profile });
    save();
    return mockPortalApi.company();
  },

  // ---------- Admin ----------

  async adminMonth(query = {}) {
    await delay();
    const s = state();
    const comp = query.competence ?? currentDocumentsCompetence();
    const late = documentsDueDate(comp) < todayInSaoPaulo();
    const rows: AdminMonthRow[] = s.customers.map((c) => {
      ensure(s, c, comp);
      const req = s.requests.filter((r) => r.customerId === c.id && r.competence === comp);
      const required = req.filter((r) => r.required);
      return {
        customerId: c.id, name: c.name, document: c.document, access: accessOf(c).level, hasLogin: c.hasLogin, invitePending: !c.hasLogin,
        onboarded: Boolean(c.onboardedAt), docsSent: required.filter((r) => r.status === "SENT").length, docsRequired: required.length,
        docsRejected: req.filter((r) => r.status === "REJECTED").length,
        guidesPublished: s.guides.filter((g) => g.customerId === c.id && g.competence === comp).length,
        guidesOverdue: s.guides.filter((g) => g.customerId === c.id && guideStatus(g) === "OVERDUE").length,
        lastSeenAt: c.lastSeenAt,
      };
    });
    const q = query.q?.toLowerCase();
    const isLate = (r: AdminMonthRow) => late && r.docsSent < r.docsRequired;
    const filtered = rows
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.document.includes(q))
      .filter((r) =>
        query.filter === "late" ? isLate(r) : query.filter === "rejected" ? r.docsRejected > 0 : query.filter === "unpaid" ? r.guidesOverdue > 0 : query.filter === "no_access" ? !r.hasLogin : true,
      );
    save();
    return {
      competence: comp, dueDate: documentsDueDate(comp), items: filtered, total: filtered.length, page: 1, pageSize: 30,
      totals: {
        customers: rows.length, complete: rows.filter((r) => r.docsSent === r.docsRequired).length, late: rows.filter(isLate).length,
        rejected: rows.filter((r) => r.docsRejected).length, guidesOverdue: rows.filter((r) => r.guidesOverdue).length, noAccess: rows.filter((r) => !r.hasLogin).length,
      },
    };
  },
  async adminCustomers(query = {}) {
    await delay();
    const q = query.q?.toLowerCase();
    const items = state()
      .customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.includes(q) || c.document.includes(q))
      .map((c) => ({ id: c.id, name: c.name, email: c.email, document: c.document, access: accessOf(c).level, hasLogin: c.hasLogin, invitePending: !c.hasLogin, endsAt: c.endsAt, createdAt: c.createdAt }));
    return { items, total: items.length, page: 1, pageSize: 30 };
  },
  async adminCustomer(id) {
    await delay();
    const c = customer(id);
    const s = state();
    const detail: AdminCustomerDetail = {
      id: c.id, name: c.name, email: c.email, phone: c.phone, document: c.document, createdAt: c.createdAt, onboardedAt: c.onboardedAt,
      remindersEnabled: c.remindersEnabled, profile: c.profile, access: accessOf(c),
      members: [{ userId: "usr_" + c.id, name: c.name, email: c.email, role: "OWNER", activated: c.hasLogin, inviteSentAt: iso(-10), inviteExpiresAt: c.hasLogin ? null : iso(-3), lastSeenAt: c.lastSeenAt }],
      contracts: [{ id: "ctr_" + c.id, plan: "exactra", period: "ANNUAL", method: "PIX", status: "ACTIVE", source: c.id === "cus_5" ? "MANUAL" : "CHECKOUT", amountCents: 358800, startsAt: c.startsAt, endsAt: c.endsAt }],
      disabledItemIds: c.disabledItemIds,
      checklist: s.items
        .filter((i) => i.active && (!i.customerId || i.customerId === c.id))
        .map((i) => ({ ...i, applies: Boolean(i.customerId) || itemApplies(checklistAppliesToSchema.parse(i.appliesTo), c.profile), disabled: c.disabledItemIds.includes(i.id) })),
    };
    return detail;
  },
  async adminCreateCustomer(input: CreateManualCustomerInput) {
    await delay(500);
    const id = uid("cus");
    state().customers.push({
      id, name: input.name, email: input.email, phone: input.phone, document: input.document.replace(/\D/g, ""), createdAt: new Date().toISOString(),
      profile: null, onboardedAt: null, remindersEnabled: true, disabledItemIds: [], startsAt: `${input.startsAt}T12:00:00Z`, endsAt: `${input.endsAt}T12:00:00Z`,
      hasLogin: false, lastSeenAt: null,
    });
    save();
    return { id };
  },
  async adminUpdateCustomer(id, input: UpdateCustomerInput) {
    await delay();
    const c = customer(id);
    if (input.remindersEnabled !== undefined) c.remindersEnabled = input.remindersEnabled;
    if (input.disabledItemIds) c.disabledItemIds = input.disabledItemIds;
    if (input.profile !== undefined) c.profile = input.profile;
    save();
    return mockPortalApi.adminCustomer(id);
  },
  async adminInvite(id) {
    await delay(500);
    const c = customer(id);
    if (c.hasLogin) throw new ApiError(409, 'Este cliente já ativou o acesso. Para trocar a senha, use "Esqueci minha senha".');
    return { email: c.email, expiresAt: iso(7) };
  },
  async adminDocuments(id, competence) {
    await delay();
    return month(customer(id), competence, false);
  },
  async adminReject(requestId, input) {
    await delay();
    const r = state().requests.find((x) => x.id === requestId);
    if (r) Object.assign(r, { status: "REJECTED", rejection: { reason: input.reason, note: input.note ?? null, at: new Date().toISOString() } });
    save();
    return {};
  },
  async adminFileUrl(fileId) {
    return mockPortalApi.fileUrl(fileId);
  },
  async adminCreateUpload(input) {
    await delay(150);
    return createTicket(input, input.customerId!, true);
  },
  async adminCompleteUpload(fileId) {
    await delay(150);
    return complete(fileId);
  },
  async adminParseGuide(fileId) {
    await delay(900);
    const f = state().files.find((x) => x.id === fileId);
    const c = f ? customer(f.customerId) : null;
    return {
      hasText: true, barcode: null, barcodeAmountCents: null, amountMatchesText: false, dueDate: day(20), competence: currentDocumentsCompetence(),
      type: "DAS", documentsFound: c ? [c.document] : [], documentMatches: true,
      warnings: ["Modo mock: o PDF não é lido de verdade. Digite o valor e, se quiser, a linha digitável."],
    };
  },
  async adminCreateGuide(input: CreateGuideInput) {
    createGuideSchema.parse(input);
    await delay(500);
    const id = uid("gde");
    state().guides.push({
      id, customerId: input.customerId, fileId: input.fileId, receiptFileId: null, type: input.type, label: input.label ?? null, competence: input.competence,
      amountCents: input.amountCents, dueDate: input.dueDate, barcode: input.barcode?.replace(/\D/g, "") ?? null, paidAt: null, publishedAt: new Date().toISOString(),
    });
    save();
    return { id };
  },
  async adminDeleteGuide(id) {
    await delay();
    const s = state();
    s.guides = s.guides.filter((g) => g.id !== id);
    save();
  },
  async adminGuides(customerId) {
    await delay();
    return state().guides.filter((g) => g.customerId === customerId).sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((g) => ({ ...guideView(g), publishedBy: "Equipe Exactra" }));
  },
  async adminChecklistItems() {
    await delay();
    return state().items.filter((i) => !i.customerId).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async adminCreateChecklistItem(input: UpsertChecklistItemInput) {
    await delay();
    const item: ChecklistItem = {
      id: uid("itm"), title: input.title, description: input.description ?? null, required: input.required ?? true, appliesTo: input.appliesTo ?? {},
      active: input.active ?? true, sortOrder: input.sortOrder ?? 100, customerId: input.customerId ?? null,
      startsCompetence: input.startsCompetence ?? addMonthsToCompetence(currentDocumentsCompetence(), 1),
    };
    state().items.push(item);
    addToOpenMonth(state());
    save();
    return item;
  },
  async adminUpdateChecklistItem(id, input) {
    await delay();
    const item = state().items.find((i) => i.id === id);
    if (!item) throw new ApiError(404, "Not Found");
    Object.assign(item, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
    if (input.startsCompetence) addToOpenMonth(state());
    save();
    return item;
  },

  /** No storage in mock mode: fake a quick progress bar. */
  async putFile(_ticket, _file, onProgress) {
    for (const p of [0.3, 0.7, 1]) {
      await delay(120);
      onProgress?.(p);
    }
  },
};
