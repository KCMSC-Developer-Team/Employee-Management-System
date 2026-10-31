export type Mail = { to: string; subject: string; html: string; text?: string };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Branded e-mail body — matches the dashboard: solid colours, square corners, no gradients. */
const FONT = 'Roboto,Helvetica,Arial,sans-serif';

export function emailHtml(opts: { heading: string; paragraphs: string[]; ctaLabel?: string; ctaUrl?: string }) {
  const paras = opts.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:#333333">${esc(p)}</p>`)
    .join('');
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 18px"><tr><td style="background:#00a65a;border:1px solid #008d4c">
           <a href="${esc(opts.ctaUrl)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">${esc(opts.ctaLabel)}</a>
         </td></tr></table>
         <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.5;color:#5a6670;word-break:break-all">If the button does not work, copy this link into your browser:<br>${esc(opts.ctaUrl)}</p>`
      : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ecf0f5;font-family:${FONT}">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ecf0f5"><tr><td align="center" style="padding:24px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border:1px solid #d2d6de;border-top:3px solid #00a65a">
      <tr><td style="background:#222d32;border-bottom:3px solid #f0b429;padding:16px 24px">
        <div style="font-family:${FONT};font-size:18px;font-weight:bold;color:#ffffff">K C Model School &amp; College</div>
        <div style="font-family:${FONT};font-size:14px;color:#b8c7ce;margin-top:2px">Employee Management System</div>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:bold;color:#1f2a33">${esc(opts.heading)}</h1>
        ${paras}${cta}
      </td></tr>
      <tr><td style="background:#f4f6f8;border-top:1px solid #d2d6de;padding:14px 24px;font-family:${FONT};font-size:14px;color:#5a6670">This is an automated message from the school’s Employee Management System.</td></tr>
    </table>
  </td></tr></table></body></html>`;
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
