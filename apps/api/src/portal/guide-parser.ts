import { Logger } from '@nestjs/common';
import { extractText, getDocumentProxy } from 'unpdf';
import { findBarcodeLines, type GuideParseResult, type GuideType } from '@exactra/shared';

const log = new Logger('GuideParser');

/** "1.234,56" → 123456 */
const cents = (s: string) => Number(s.replace(/\./g, '').replace(',', ''));

const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const TYPE_HINTS: [GuideType, RegExp][] = [
  ['DAS', /simples nacional|\bdas\b|pgdas/],
  ['FGTS', /\bfgts\b/],
  ['INSS', /\bgps\b|previdencia social|\binss\b/],
  ['DARF', /\bdarf\b|receitas federais/],
  ['ICMS', /\bicms\b|\bgare\b/],
  ['ISS', /\biss\b|imposto sobre servicos/],
  ['IRPF', /imposto de renda pessoa fisica/],
];

/** dd/mm/yyyy after a due-date label ("Pagar este documento até", "Vencimento", "Data limite"). */
function findDueDate(text: string): string | null {
  const m = plain(text).match(/(?:vencimento|pagar (?:este documento )?ate|data limite|valido ate)[^\d]{0,40}(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "Período de apuração 10/2026", "Competência: 10/2026" or "Outubro/2026". */
function findCompetence(text: string): string | null {
  const t = plain(text);
  const numeric = t.match(/(?:periodo de apuracao|competencia|apuracao|referencia)[^\d]{0,30}(?:\d{2}\/)?(\d{2})\/(\d{4})/);
  if (numeric && Number(numeric[1]) >= 1 && Number(numeric[1]) <= 12) return `${numeric[2]}-${numeric[1]}`;
  const named = t.match(new RegExp(`(${MONTHS.join('|')})\\s*(?:\\/|de)\\s*(\\d{4})`));
  return named ? `${named[2]}-${String(MONTHS.indexOf(named[1]) + 1).padStart(2, '0')}` : null;
}

export async function extractPdfText(pdf: Uint8Array): Promise<string> {
  try {
    const { text } = await extractText(await getDocumentProxy(pdf), { mergePages: true });
    return text;
  } catch (err) {
    log.warn(`PDF text extraction failed: ${(err as Error).message}`);
    return '';
  }
}

/**
 * Reads what it can from a guide's text to pre-fill the publish form. Nothing here is trusted
 * on its own: the line must pass every check digit and its amount must be printed in the PDF,
 * and a person confirms everything before publishing (decision 25).
 */
export function parseGuideText(text: string, customerDocument: string): GuideParseResult {
  const warnings: string[] = [];
  const hasText = text.replace(/\s/g, '').length > 30;
  if (!hasText) {
    return {
      hasText, barcode: null, barcodeAmountCents: null, amountMatchesText: false, dueDate: null, competence: null, type: null,
      documentsFound: [], documentMatches: null,
      warnings: ['O PDF não tem texto (parece escaneado). Preencha os campos olhando a guia.'],
    };
  }

  const lines = findBarcodeLines(text);
  const line = lines[0] ?? null;
  if (!line) warnings.push('Nenhuma linha digitável válida encontrada. A guia será publicada só com o PDF.');
  if (lines.length > 1) warnings.push('Há mais de uma linha digitável no PDF. Confira se é a guia certa.');

  const printed = [...text.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)].map((m) => cents(m[1]));
  const amountMatchesText = Boolean(line?.amountCents && printed.includes(line.amountCents));
  if (line && !line.amountCents) warnings.push('A linha digitável não traz valor. Digite o valor da guia.');
  else if (line && !amountMatchesText) warnings.push('O valor da linha digitável não aparece no PDF. Confira antes de publicar.');

  const documentsFound = [
    ...new Set([...text.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)].map((m) => m[0].replace(/\D/g, ''))),
  ];
  const own = customerDocument.replace(/\D/g, '');
  // The CNPJ base (8 digits) is enough: branches share it.
  const documentMatches = documentsFound.length
    ? documentsFound.some((d) => d === own || (d.length === 14 && own.length === 14 && d.slice(0, 8) === own.slice(0, 8)))
    : null;
  if (documentMatches === false) warnings.push('O CPF/CNPJ da guia não é o deste cliente. Confira se escolheu o cliente certo.');

  const dueDate = findDueDate(text);
  if (!dueDate) warnings.push('Não achamos o vencimento. Digite a data.');
  const t = plain(text);
  const type = TYPE_HINTS.find(([, re]) => re.test(t))?.[0] ?? null;

  return {
    hasText,
    barcode: line?.line ?? null,
    barcodeAmountCents: line?.amountCents ?? null,
    amountMatchesText,
    dueDate,
    competence: findCompetence(text),
    type,
    documentsFound,
    documentMatches,
    warnings,
  };
}
