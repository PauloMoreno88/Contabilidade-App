import type { DocumentRequest, StoredFile, TaxGuide } from '../generated/prisma/client.js';
import { canDeleteFile, dateOnly, fromDateOnly, toDocumentRequest, toPortalGuide } from './serialize.js';

// 24/10/2026: the month being collected is September 2026.
const NOW = new Date('2026-10-24T15:00:00Z');

const file = (over: Partial<StoredFile> = {}): StoredFile => ({
  id: 'f1',
  customerId: 'c1',
  kind: 'DOCUMENT',
  storageKey: 'k1',
  fileName: 'extrato.pdf',
  contentType: 'application/pdf',
  sizeBytes: 1000,
  competence: '2026-09',
  requestId: null,
  uploadedById: null,
  byStaff: false,
  uploadedAt: new Date('2026-10-02T10:00:00Z'),
  createdAt: new Date('2026-10-02T09:59:00Z'),
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('date-only columns', () => {
  it('keep the calendar day both ways', () => {
    expect(dateOnly(fromDateOnly('2026-11-20'))).toBe('2026-11-20');
    expect(fromDateOnly('2026-11-20').toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });
});

describe('canDeleteFile', () => {
  it('the customer can delete their own file of the open month', () => {
    expect(canDeleteFile(file(), true)).toBe(true);
  });
  it('but not in read-only mode, not the team\'s files, not guides and not past months', () => {
    expect(canDeleteFile(file(), false)).toBe(false);
    expect(canDeleteFile(file({ byStaff: true }), true)).toBe(false);
    expect(canDeleteFile(file({ kind: 'GUIDE' }), true)).toBe(false);
    expect(canDeleteFile(file({ competence: '2026-08' }), true)).toBe(false);
  });
});

describe('toDocumentRequest', () => {
  const request = (over: Partial<DocumentRequest> = {}) =>
    ({
      id: 'r1',
      customerId: 'c1',
      competence: '2026-09',
      title: 'Extrato bancário',
      description: null,
      required: true,
      dueDate: new Date('2026-10-10T00:00:00Z'),
      status: 'SENT',
      rejectionReason: null,
      rejectionNote: null,
      rejectedAt: null,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      files: [file(), file({ id: 'f2', uploadedAt: null })],
      ...over,
    }) as DocumentRequest & { files: StoredFile[] };

  it('lists only finished uploads and keeps the due day', () => {
    const r = toDocumentRequest(request(), true);
    expect(r.dueDate).toBe('2026-10-10');
    expect(r.files.map((f) => f.id)).toEqual(['f1']);
    expect(r.files[0]).toMatchObject({ uploadedBy: 'customer', canDelete: true });
    expect(r.rejection).toBeNull();
  });

  it('shows the rejection only while rejected', () => {
    const rejected = request({ status: 'REJECTED', rejectionReason: 'illegible', rejectionNote: 'Cortado', rejectedAt: new Date('2026-10-05T12:00:00Z') });
    expect(toDocumentRequest(rejected).rejection).toEqual({ reason: 'illegible', note: 'Cortado', at: '2026-10-05T12:00:00.000Z' });
    expect(toDocumentRequest(request({ rejectionReason: 'illegible' })).rejection).toBeNull();
  });
});

describe('toPortalGuide', () => {
  const guide = (over: Partial<TaxGuide> = {}) => ({
    id: 'g1',
    customerId: 'c1',
    type: 'DAS' as const,
    label: null,
    competence: '2026-09',
    amountCents: 41250,
    dueDate: new Date('2026-10-20T00:00:00Z'),
    barcode: null,
    fileId: 'f1',
    paidAt: null,
    receiptFileId: null,
    publishedById: 'u1',
    publishedAt: new Date('2026-10-05T00:00:00Z'),
    file: file({ kind: 'GUIDE', byStaff: true }),
    receipt: null,
    ...over,
  });

  it('is overdue after the due date and paid once marked', () => {
    expect(toPortalGuide(guide(), NOW).status).toBe('OVERDUE');
    expect(toPortalGuide(guide({ dueDate: new Date('2026-10-24T00:00:00Z') }), NOW).status).toBe('OPEN');
    expect(toPortalGuide(guide({ paidAt: new Date('2026-10-21T00:00:00Z') }), NOW)).toMatchObject({ status: 'PAID', paidAt: '2026-10-21T00:00:00.000Z' });
  });

  it('the guide file is the team\'s and cannot be deleted', () => {
    expect(toPortalGuide(guide(), NOW).file).toMatchObject({ uploadedBy: 'exactra', canDelete: false });
  });
});
