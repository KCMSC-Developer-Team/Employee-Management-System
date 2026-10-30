export type Mail = { to: string; subject: string; html: string; text?: string };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Branded e-mail body using the school colour palette. */
export function emailHtml(opts: { heading: string; paragraphs: string[]; ctaLabel?: string; ctaUrl?: string }) {
  const paras = opts.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#242824">${esc(p)}</p>`)
    .join('');
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:22px 0"><a href="${esc(opts.ctaUrl)}" style="background:#176B45;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:15px;display:inline-block">${esc(opts.ctaLabel)}</a></p>
         <p style="margin:0;font-size:12px;color:#69716B;word-break:break-all">If the button does not work, copy this link:<br>${esc(opts.ctaUrl)}</p>`
      : '';
  return `<!doctype html><html><body style="margin:0;background:#F7F5EF;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5EF;padding:24px 12px"><tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border:1px solid #D9D8CF;border-radius:8px;overflow:hidden" cellpadding="0" cellspacing="0">
      <tr><td style="background:#124C36;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:600">K C Model School &amp; College
        <div style="height:3px;width:44px;background:#B59A4A;margin-top:8px"></div></td></tr>
      <tr><td style="padding:26px 24px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#242824">${esc(opts.heading)}</h1>
        ${paras}${cta}
      </td></tr>
      <tr><td style="padding:14px 24px;background:#EFEEE7;font-size:12px;color:#69716B">Employee Management System · This is an automated message.</td></tr>
    </table></td></tr></table></body></html>`;
}

/** Sends through Resend. Never throws — returns { ok, error }. */
export async function sendEmails(messages: Mail[]): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not configured' };
  if (messages.length === 0) return { ok: true };
  const from = process.env.EMAIL_FROM || 'K C Model School & College <onboarding@resend.dev>';
  try {
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100).map((m) => ({
        from,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
      }));
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Email failed' };
  }
}

export const sendEmail = (m: Mail) => sendEmails([m]);
