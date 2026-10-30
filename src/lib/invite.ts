import { createToken } from './auth';
import { emailHtml, sendEmails } from './mail';
import { appUrl } from './utils';

type Target = { id: string; email: string; name: string };

/**
 * Creates a one-time set-password link for each person and e-mails it through Resend.
 * Returns the links too, so an administrator can copy one if e-mail is not configured yet.
 */
export async function sendSetPasswordLinks(targets: Target[], kind: 'invite' | 'reset') {
  const links: { id: string; email: string; link: string }[] = [];
  const mails = [];
  for (const t of targets) {
    const raw = await createToken(t.id, kind, kind === 'invite' ? 72 : 1);
    const link = `${appUrl()}/reset?token=${raw}`;
    links.push({ id: t.id, email: t.email, link });
    mails.push({
      to: t.email,
      subject: kind === 'invite' ? 'Your K C Model School & College account' : 'Reset your password',
      html: emailHtml({
        heading: kind === 'invite' ? `Welcome, ${t.name}` : 'Reset your password',
        paragraphs:
          kind === 'invite'
            ? [
                'An account has been created for you in the K C Model School & College employee system.',
                'Press the button below to choose your password. The link works for 3 days.',
              ]
            : [
                'We received a request to reset your password.',
                'Press the button below to choose a new one. The link works for 1 hour. If you did not ask for this, you can ignore this e-mail.',
              ],
        ctaLabel: kind === 'invite' ? 'Set my password' : 'Choose a new password',
        ctaUrl: link,
      }),
      text: `${kind === 'invite' ? 'Set your password' : 'Reset your password'}: ${link}`,
    });
  }
  const result = await sendEmails(mails);
  return { links, ...result };
}
