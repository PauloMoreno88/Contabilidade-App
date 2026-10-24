"""Generate fictional PDFs for manual portal upload tests."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


HERE = Path(__file__).parent
pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))


def make_pdf(name: str, title: str, subtitle: str, rows: list[tuple[str, str]]) -> None:
    path = HERE / name
    pdf = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    pdf.setTitle(f"TESTE - {title}")
    pdf.setAuthor("Arquivo fictício para teste de upload")

    pdf.saveState()
    pdf.translate(width / 2, height / 2)
    pdf.rotate(35)
    pdf.setFillColor(colors.Color(0.78, 0.1, 0.15, alpha=0.12))
    pdf.setFont("Arial-Bold", 44)
    pdf.drawCentredString(0, 0, "TESTE - NÃO PAGAR")
    pdf.restoreState()

    pdf.setFillColor(colors.HexColor("#C82333"))
    pdf.rect(0, height - 18, width, 18, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#222222"))
    pdf.setFont("Arial-Bold", 19)
    pdf.drawString(52, height - 75, title)
    pdf.setFont("Arial", 10)
    pdf.drawString(52, height - 96, subtitle)
    pdf.setStrokeColor(colors.HexColor("#dddddd"))
    pdf.line(52, height - 113, width - 52, height - 113)

    y = height - 145
    for label, value in rows:
        pdf.setFont("Arial-Bold", 10)
        pdf.drawString(52, y, label)
        pdf.setFont("Arial", 10)
        pdf.drawString(218, y, value)
        y -= 29

    pdf.setFillColor(colors.HexColor("#A51D2B"))
    pdf.setFont("Arial-Bold", 10)
    pdf.drawString(52, 70, "DOCUMENTO FICTÍCIO - APENAS TESTE DE UPLOAD")
    pdf.setFont("Arial", 9)
    pdf.drawString(52, 53, "Sem validade fiscal, bancária, trabalhista ou para pagamento.")
    pdf.save()


for filename, title, amount, due in [
    ("guia-das-teste.pdf", "DAS - Simples Nacional", "412,50", "20/11/2026"),
    ("guia-darf-teste.pdf", "DARF - Impostos federais", "185,30", "25/11/2026"),
    ("guia-fgts-teste.pdf", "FGTS", "96,80", "20/11/2026"),
]:
    make_pdf(filename, title, "Guia demonstrativa sem linha digitável", [
        ("Competência", "10/2026"),
        ("Vencimento", due),
        ("Valor", f"R$ {amount}"),
        ("Linha digitável", "Não emitida - preencher somente se houver guia real"),
    ])

make_pdf("documento-extrato-bancario-teste.pdf", "Extrato bancário", "Conta fictícia - mês completo", [
    ("Competência", "09/2026"),
    ("Período", "01/09/2026 a 30/09/2026"),
    ("01/09/2026", "Saldo inicial: R$ 1.000,00"),
    ("10/09/2026", "Crédito de teste: R$ 200,00"),
    ("22/09/2026", "Débito de teste: R$ 75,00"),
    ("30/09/2026", "Saldo final: R$ 1.125,00"),
])

make_pdf("documento-notas-compra-teste.pdf", "Notas fiscais de compra", "Relação fictícia para empresa com comércio", [
    ("Competência", "09/2026"),
    ("Documento", "Nota de compra demonstrativa nº 001"),
    ("Data", "12/09/2026"),
    ("Descrição", "Mercadorias fictícias para teste"),
    ("Valor", "R$ 150,00"),
])

make_pdf("documento-ponto-funcionarios-teste.pdf", "Ponto e ocorrências", "Registro fictício para empresa com funcionários", [
    ("Competência", "09/2026"),
    ("Funcionário", "Colaborador de Teste"),
    ("Período", "01/09/2026 a 30/09/2026"),
    ("Ponto", "20 dias registrados - dados demonstrativos"),
    ("Ocorrências", "Nenhuma ocorrência demonstrativa"),
])

make_pdf("documento-notas-servico-teste.pdf", "Notas fiscais de serviço", "Item opcional do checklist de serviços", [
    ("Competência", "09/2026"),
    ("Documento", "Nota de serviço demonstrativa nº 001"),
    ("Data", "15/09/2026"),
    ("Descrição", "Serviço fictício para teste"),
    ("Valor", "R$ 250,00"),
])
