# @exactra/emails

E-mails transacionais da Exactra em React Email (`@react-email/components` + `@react-email/render`). Cada função é pura e assíncrona: recebe props tipadas e devolve `{ subject, html, text }`. Ela não envia nada; o envio continua no `apps/api` (`sendEmail`, Resend).

- **Layout:** 600px, mobile first, tabelas com CSS inline, modo escuro via `prefers-color-scheme` (Apple Mail, iOS, Outlook Mac; o Gmail inverte as cores sozinho e o layout aguenta). Sem SVG: o logo é PNG por URL absoluta.
- **Segurança:** todo texto vindo do usuário passa pelo escape do React. Assuntos perdem quebras de linha. URLs que entram em `href` precisam ser `http(s)` (o render falha com `Unsafe URL protocol` se não forem).
- **Texto:** a versão `text` é escrita à mão (`src/text.ts`), não convertida do HTML.
- **Textos editáveis:** `src/copy.ts`. A timeline "Contratei. E agora?", a lista de documentos e o contato (WhatsApp, e-mail) vêm de `@exactra/shared` (`src/content.ts`), os mesmos do site. Itens marcados `PLACEHOLDER` aguardam a Exactra ou o contador (prazo de contato, lista final de documentos, número do WhatsApp).

## Comandos

```
pnpm --filter @exactra/emails build     # dist/index.mjs + dist/index.d.mts
pnpm --filter @exactra/emails test      # Vitest
pnpm --filter @exactra/emails preview   # build + .preview/*.html e *.txt com dados de exemplo
```

O preview usa `EMAIL_ASSET_BASE_URL=http://localhost:3000` por padrão (rode `pnpm --filter web dev` para o logo aparecer) ou outra URL que sirva `apps/web/public`.

## Variável de ambiente

| Variável | Uso | Produção |
|---|---|---|
| `EMAIL_ASSET_BASE_URL` | Origem do site público. Logo em `{base}/email/logo.png` (arquivo em `apps/web/public/email/logo.png`) e link padrão de renovação `{base}/checkout?plan=…` | `https://www.exactracontabilidade.com.br` |

Lida no momento do render (sem valor, usa `https://www.exactracontabilidade.com.br`).

## Assinaturas

```ts
type DateInput = Date | string; // ISO; datas exibidas no fuso America/Sao_Paulo
type EmailContent = { subject: string; html: string; text: string };

type ContractSummary = {
  plan: PlanId;              // @exactra/shared
  period: BillingPeriod;     // @exactra/shared
  method: PaymentMethod;     // @exactra/shared
  amountCents: number;       // Contract.amountCents (cartão: mensal; Pix/boleto: período inteiro)
  startsAt: DateInput;       // Contract.startsAt
  endsAt?: DateInput | null; // cartão: fim do período atual (próxima cobrança); Pix/boleto: fim do pré-pago
};

renderWelcomeEmail(props: { customerName: string; contract: ContractSummary }): Promise<EmailContent>

renderNewContractNotice(props: {
  customer: { name: string; email: string; phone: string; document: string };
  contract: ContractSummary & { id: string };
  source?: string | null;    // ex.: "Simulador (google / lancamento)"; omita sem lead
  adminUrl?: string;         // ex.: `${WEB_ORIGIN}/admin/contrato?id=${contract.id}`
}): Promise<EmailContent>

renderPasswordResetEmail(props: { name: string; url: string; expiresInMinutes?: number }): Promise<EmailContent>

renderTwoFactorCodeEmail(props: { name?: string; code: string; expiresInMinutes?: number }): Promise<EmailContent>

renderExpiryReminderEmail(props: {
  customerName: string;
  contract: ContractSummary & { endsAt: DateInput };
  renewUrl?: string;         // padrão: `${EMAIL_ASSET_BASE_URL}/checkout?plan=${plan}`
}): Promise<EmailContent>
```

`expiresInMinutes` é opcional de propósito: sem ele, o texto fica neutro ("expira depois de um tempo"). Passe o valor real configurado no Better Auth se quiser mostrá-lo.

## Integração no `apps/api` (para o agente de back)

1. `apps/api/package.json`: adicionar `"@exactra/emails": "workspace:*"`. O pacote é consumido **compilado** (`dist/`, ESM + `.d.mts`), então não precisa de `jsx` no tsconfig do API nem entrar em `alwaysBundle`. As dependências dele (React, React Email) ficam no próprio pacote.
2. Build: o `dist/` precisa existir antes do build do API. `pnpm -r build` já respeita a ordem; no Render use `pnpm --filter api... build` (o `...` inclui as dependências do workspace).
3. `sendEmail` passa a aceitar `text` e repassa ao Resend (`resend.emails.send({ from, to, subject, html, text })`).
4. Trocas sugeridas:

```ts
import {
  renderWelcomeEmail, renderNewContractNotice, renderPasswordResetEmail,
  renderTwoFactorCodeEmail, renderExpiryReminderEmail,
} from '@exactra/emails';

// notifications.ts, notifyActivation (contract com include: { customer: { include: { lead: true } } })
const summary = { plan: c.plan, period: c.period, method: c.method, amountCents: c.amountCents, startsAt: c.startsAt!, endsAt: c.endsAt };
await sendEmail({ to: c.customer.email, ...(await renderWelcomeEmail({ customerName: c.customer.name, contract: summary })) });
await sendEmail({
  to: process.env.ADMIN_NOTIFY_EMAIL,
  ...(await renderNewContractNotice({
    customer: c.customer,                       // name, email, phone, document
    contract: { ...summary, id: c.id },
    source: c.customer.lead ? `Simulador (${[utm?.source, utm?.campaign].filter(Boolean).join(' / ') || 'direto'})` : null,
    adminUrl: `${webOrigin()}/admin/contrato?id=${c.id}`,
  })),
});

// notifications.ts, sendExpiryNotice
await sendEmail({ to: c.customer.email, ...(await renderExpiryReminderEmail({ customerName: c.customer.name, contract: { ...summary, endsAt: c.endsAt! } })) });

// auth.ts
sendResetPassword: async ({ user, url }) =>
  sendEmail({ to: user.email, ...(await renderPasswordResetEmail({ name: user.name, url })) }),
// twoFactor({ otpOptions: { sendOTP: async ({ user, otp }) => ... } })
sendOTP: async ({ user, otp }) =>
  sendEmail({ to: user.email, ...(await renderTwoFactorCodeEmail({ name: user.name, code: otp })) }),
```

Depois disso, `escapeHtml` em `notifications.ts` deixa de ser necessário para os e-mails.
