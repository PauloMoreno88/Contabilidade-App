// Manual end-to-end check of the real Stripe flow (TEST mode). See README "Teste manual com o Stripe".
// Usage: node scripts/checkout-flow.mjs [CARD|PIX|BOLETO] [essencial|profissional|empresarial]
// Needs the API running (pnpm start:dev) and `stripe listen --forward-to localhost:3001/webhooks/stripe`.
const [method = 'CARD', plan = 'essencial'] = process.argv.slice(2);
const api = process.env.API_URL ?? 'http://localhost:3001';
const period = method === 'CARD' ? 'MONTHLY' : 'QUARTERLY';

const res = await fetch(`${api}/checkout/sessions`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    plan,
    period,
    method,
    consent: true,
    customer: { name: 'Teste Manual', email: 'teste-manual@exactra.test', phone: '11999990000', document: '12345678909' },
  }),
});
const body = await res.json();
if (!res.ok) {
  console.error(`POST /checkout/sessions → ${res.status}`, body);
  process.exit(1);
}

const { contractId, statusToken, checkoutUrl } = body;
console.log(`Contrato ${contractId} criado (${plan}, ${method}, ${period}).`);
console.log(`\nAbra no navegador e pague:\n${checkoutUrl}\n`);
if (method === 'CARD') console.log('Cartão de teste: 4242 4242 4242 4242, validade futura qualquer, CVC qualquer.\n');
console.log('Aguardando o webhook ativar o contrato (até 10 min)...');

let last;
for (let i = 0; i < 120; i++) {
  const s = await (await fetch(`${api}/contracts/${contractId}/status?token=${statusToken}`)).json();
  if (s.status !== last) console.log(`  status: ${(last = s.status)}`);
  if (s.status === 'ACTIVE') {
    console.log('\nOK: contrato ACTIVE (ativado pelo webhook). Confira em GET /admin/contracts/' + contractId);
    process.exit(0);
  }
  if (s.status === 'CANCELED') process.exit(1);
  await new Promise((r) => setTimeout(r, 5000));
}
console.error('\nTempo esgotado: o contrato não foi ativado. O `stripe listen` está encaminhando para /webhooks/stripe?');
process.exit(1);
