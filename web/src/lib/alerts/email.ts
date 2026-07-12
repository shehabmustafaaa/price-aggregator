import nodemailer from "nodemailer";

/** Email channel. With SMTP_* env vars set, sends real mail; otherwise
 *  logs to the server console (dev). Other channels (Telegram/WhatsApp)
 *  are future implementations of the same sendAlertEmail-style contract. */
export async function sendAlertEmail(
  to: string,
  subject: string,
  html: string,
) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[alert-email dev] to=${to} subject="${subject}"`);
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "alerts@localhost",
    to,
    subject,
    html,
  });
}
