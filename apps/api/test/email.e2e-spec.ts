const { send } = vi.hoisted(() => ({
  send: vi.fn(async (_payload: Record<string, unknown>) => ({ error: null as { message: string } | null })),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const email = { to: 'cliente@ex.com', subject: 'Assunto', html: '<p>oi</p>', text: 'oi' };

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  send.mockClear();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import('../src/email.js')).sendEmail;
}

describe('sendEmail (Resend)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('sends from EMAIL_FROM with html and text, and Reply-To when configured', async () => {
    const sendEmail = await load({
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'Exactra <contato@envio.exactra.test>',
      EMAIL_REPLY_TO: 'atendimento@exactra.test',
    });
    await sendEmail(email);
    expect(send).toHaveBeenCalledWith({
      from: 'Exactra <contato@envio.exactra.test>',
      to: 'cliente@ex.com',
      subject: 'Assunto',
      html: '<p>oi</p>',
      text: 'oi',
      replyTo: 'atendimento@exactra.test',
    });
  });

  it('omits Reply-To when it is not configured or blank', async () => {
    const sendEmail = await load({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'Exactra <contato@envio.exactra.test>', EMAIL_REPLY_TO: '  ' });
    await sendEmail(email);
    expect(send.mock.calls[0][0]).not.toHaveProperty('replyTo');
  });

  it('throws when Resend refuses the e-mail', async () => {
    const sendEmail = await load({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'Exactra <contato@envio.exactra.test>', EMAIL_REPLY_TO: undefined });
    send.mockResolvedValueOnce({ error: { message: 'domain not verified' } });
    await expect(sendEmail(email)).rejects.toThrow('Resend: domain not verified');
  });

  it('without RESEND_API_KEY it only logs in dev and fails in production', async () => {
    const sendEmail = await load({ RESEND_API_KEY: undefined, NODE_ENV: 'test' });
    await expect(sendEmail(email)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    process.env.NODE_ENV = 'production';
    await expect(sendEmail(email)).rejects.toThrow('RESEND_API_KEY is not set');
  });
});
