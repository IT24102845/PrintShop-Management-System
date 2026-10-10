// =============================================================================
// PrintShop Management System — Email Utility (Gmail SMTP via Nodemailer)
// =============================================================================
// Required env vars:
//   SMTP_USER  — Gmail address used to send mail (e.g. yourshop@gmail.com)
//   SMTP_PASS  — 16-char Gmail App Password (NOT the normal Gmail password)
// Optional:
//   SMTP_HOST  (default smtp.gmail.com), SMTP_PORT (default 465)
//   MAIL_FROM  (default "Supreme Advertising <SMTP_USER>")
// =============================================================================

import nodemailer, { Transporter } from 'nodemailer';
import logger from './logger';

let transporter: Transporter | null = null;

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (!isMailerConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASS in backend/.env');
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      // Gmail shows app passwords with spaces ("abcd efgh ijkl mnop") — strip them.
      pass: process.env.SMTP_PASS!.replace(/\s+/g, ''),
    },
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
  const from = process.env.MAIL_FROM ?? `Supreme Advertising <${process.env.SMTP_USER}>`;
  await getTransporter().sendMail({ from, to, subject, html, text });
  logger.info(`Email sent to ${to}: ${subject}`);
}

/** Builds and sends the password reset email. */
export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const safeName = name.replace(/[<>&"]/g, '');
  const subject = 'Reset your Supreme Advertising password';

  const text =
    `Hi ${safeName},\n\n` +
    `We received a request to reset your password. Open the link below to choose a new one:\n\n` +
    `${resetUrl}\n\n` +
    `This link expires in 1 hour and can only be used once.\n` +
    `If you didn't request this, you can safely ignore this email — your password won't change.\n\n` +
    `— Supreme Advertising`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f5f7;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid rgba(0,0,0,0.08);">
      <h2 style="margin:0 0 8px;color:#1d1d1f;font-size:22px;">Reset your password</h2>
      <p style="color:#515154;font-size:15px;line-height:1.5;">Hi ${safeName},</p>
      <p style="color:#515154;font-size:15px;line-height:1.5;">
        We received a request to reset the password for your Supreme Advertising account.
        Click the button below to choose a new password.
      </p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="background:#0071e3;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:980px;font-weight:600;font-size:15px;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#86868b;font-size:13px;line-height:1.5;">
        This link expires in <strong>1 hour</strong> and can only be used once.
        If you didn't request a reset, you can ignore this email — your password won't change.
      </p>
      <p style="color:#86868b;font-size:12px;word-break:break-all;margin-top:24px;">
        Button not working? Paste this link into your browser:<br>${resetUrl}
      </p>
    </div>
  </div>`;

  await sendMail(to, subject, html, text);
}
