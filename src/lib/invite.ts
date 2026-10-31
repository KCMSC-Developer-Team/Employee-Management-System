import { createToken } from './auth';
import { emailHtml, sendEmails, type Mail } from './mail';
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

type SetupTarget = { id: string; email: string; name: string; id_no: string | null };

/**
 * Set-up e-mail. People with an Employee ID sign in with that ID as both user name and password,
 * then change the password in Settings. People without an ID get a one-time link to choose a password.
 */
export async function sendSetupEmailLinks(targets: SetupTarget[]) {
  const loginUrl = `${appUrl()}/login`;
  const mails: Mail[] = [];
  for (const t of targets) {
    let paragraphs: string[];
    let ctaLabel: string;
    let ctaUrl: string;
    if (t.id_no) {
      paragraphs = [
        `Dear ${t.name},`,
        'Your account in the K C Model School & College Employee Management System is ready. Please follow these three steps.',
        `Step 1 — Sign in. Open the sign-in page. In the box marked “E-mail or ID number”, type your Employee ID: ${t.id_no}. In the password box, type the same ${t.id_no}.`,
        'Step 2 — Change your password. After you sign in, open Settings, go to the Security section and choose a password of your own. Keep it somewhere safe.',
        'Step 3 — Check your profile. Open “My profile” and make sure your details are correct. You can change your name in Settings straight away. Other profile changes are sent to IT for approval.',
        'Do not share your password. If you have already changed it, use the password you chose. If you have forgotten it, choose “Forgot password?” on the sign-in page.',
        'If you did not expect this e-mail, or need help, please contact the IT Technician of the school.',
      ];
      ctaLabel = 'Go to sign in';
      ctaUrl = loginUrl;
    } else {
      const raw = await createToken(t.id, 'invite', 24 * 7);
      ctaUrl = `${appUrl()}/reset?token=${raw}`;
      ctaLabel = 'Set my password';
      paragraphs = [
        `Dear ${t.name},`,
        'Your account in the K C Model School & College Employee Management System is ready. Please follow these two steps.',
        'Step 1 — Choose your password. Press the button below and choose a password of your own. This link works for 7 days and can be used once.',
        `Step 2 — Sign in at ${loginUrl} with your e-mail address (${t.email}) and the password you chose.`,
        'If you did not expect this e-mail, or need help, please contact the IT Technician of the school.',
      ];
    }
    mails.push({
      to: t.email,
      subject: 'Set up your K C Model School & College account',
      html: emailHtml({ heading: 'Set up your account', paragraphs, ctaLabel, ctaUrl }),
      text: [...paragraphs, `${ctaLabel}: ${ctaUrl}`].join('\n\n'),
    });
  }
  return sendEmails(mails);
}
