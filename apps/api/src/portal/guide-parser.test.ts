import { formatBarcodeLine, mod11Arrecadacao } from '@exactra/shared';
import { parseGuideText } from './guide-parser.js';

/** Valid 48-digit DAS line (value id 8, mod 11) for the given amount. */
function dasLine(amountCents: number) {
  const body = '818' + String(amountCents).padStart(11, '0') + '03282026123456789012345678901';
  const barcode = body.slice(0, 3) + mod11Arrecadacao(body) + body.slice(3);
  return [0, 1, 2, 3].map((i) => barcode.slice(i * 11, i * 11 + 11)).map((b) => b + mod11Arrecadacao(b)).join('');
}

const CNPJ = '12345678000195';

const das = (extra: string[] = [], line = dasLine(41250)) =>
  [
    'Documento de Arrecadação do Simples Nacional',
    'CNPJ 12.345.678/0001-95',
    'Período de Apuração 10/2026',
    'Pagar este documento até 20/11/2026',
    'Valor Total do Documento 412,50',
    formatBarcodeLine(line),
    ...extra,
  ].join('\n');

describe('parseGuideText', () => {
  it('reads a complete DAS', () => {
    const line = dasLine(41250);
    expect(parseGuideText(das([], line), CNPJ)).toEqual({
      hasText: true,
      barcode: line,
      barcodeAmountCents: 41250,
      amountMatchesText: true,
      dueDate: '2026-11-20',
      competence: '2026-10',
      type: 'DAS',
      documentsFound: [CNPJ],
      documentMatches: true,
      warnings: [],
    });
  });

  it('a scanned PDF (no text) only warns', () => {
    const r = parseGuideText('   \n  ', CNPJ);
    expect(r).toMatchObject({ hasText: false, barcode: null, dueDate: null, documentMatches: null });
    expect(r.warnings).toEqual(['O PDF não tem texto (parece escaneado). Preencha os campos olhando a guia.']);
  });

  it('warns when the amount of the line is not printed in the PDF', () => {
    const text = das().replace('412,50', '999,99');
    const r = parseGuideText(text, CNPJ);
    expect(r.amountMatchesText).toBe(false);
    expect(r.warnings).toContain('O valor da linha digitável não aparece no PDF. Confira antes de publicar.');
  });

  it('a line with a wrong digit is ignored', () => {
    const line = dasLine(41250);
    const broken = line.slice(0, 20) + ((Number(line[20]) + 1) % 10) + line.slice(21);
    const r = parseGuideText(das([], broken), CNPJ);
    expect(r.barcode).toBeNull();
    expect(r.warnings).toContain('Nenhuma linha digitável válida encontrada. A guia será publicada só com o PDF.');
  });

  it('warns about more than one line', () => {
    const r = parseGuideText(das([formatBarcodeLine(dasLine(10000))]), CNPJ);
    expect(r.warnings).toContain('Há mais de uma linha digitável no PDF. Confira se é a guia certa.');
  });

  it('another customer\'s CNPJ is flagged; a branch of the same company is not', () => {
    expect(parseGuideText(das(), '98765432000198').documentMatches).toBe(false);
    expect(parseGuideText(das(), '98765432000198').warnings).toContain('O CPF/CNPJ da guia não é o deste cliente. Confira se escolheu o cliente certo.');
    expect(parseGuideText(das(), '12345678000276').documentMatches).toBe(true);
  });

  it('finds an alphanumeric CNPJ', () => {
    const text = das().replace('CNPJ 12.345.678/0001-95', 'CNPJ 12.ABC.345/01DE-35');
    const r = parseGuideText(text, '12.abc.345/01de-35');
    expect(r.documentsFound).toEqual(['12ABC34501DE35']);
    expect(r.documentMatches).toBe(true);
  });

  it('warns when there is no due date, and reads a named competence', () => {
    const text = das().replace('Pagar este documento até 20/11/2026', '').replace('Período de Apuração 10/2026', 'Referente a Outubro de 2026');
    const r = parseGuideText(text, CNPJ);
    expect(r.dueDate).toBeNull();
    expect(r.competence).toBe('2026-10');
    expect(r.warnings).toContain('Não achamos o vencimento. Digite a data.');
  });

  it.each([
    ['Guia do FGTS - GFD', 'FGTS'],
    ['GPS - Guia da Previdência Social', 'INSS'],
    ['DARF - Documento de Arrecadação de Receitas Federais', 'DARF'],
    ['Imposto sobre Serviços de Qualquer Natureza', 'ISS'],
  ])('recognizes the type from "%s"', (title, type) => {
    const text = `${title}\nCNPJ 12.345.678/0001-95\nVencimento 10/12/2026\nValor 100,00 qualquer texto a mais`;
    expect(parseGuideText(text, CNPJ).type).toBe(type);
  });
});
