import nodemailer from "nodemailer";

export type ContactResult = "ok" | "invalid" | "rate_limited" | "send_failed";

export type ContactInput = {
  name?: string;
  email: string;
  message: string;
  /** Honeypot field — real users never fill it. */
  website?: string;
  ip: string;
};

/** Address that receives contact mail and is shown as the mailto fallback. */
export function getContactEmail(): string {
  return process.env.CONTACT_EMAIL || process.env.SMTP_FROM || "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory per-IP rate limit: 3 submissions per rolling hour. Fine for a
// single Node process (see plan.md); resets on restart, which is acceptable.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const submissions = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    submissions.set(ip, recent);
    return true;
  }
  recent.push(now);
  submissions.set(ip, recent);
  // Opportunistic cleanup so the map doesn't grow unboundedly.
  if (submissions.size > 1000) {
    for (const [k, v] of submissions) {
      if (v.every((t) => now - t >= WINDOW_MS)) submissions.delete(k);
    }
  }
  return false;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Validate + rate-limit + email a contact-form submission. Never throws. */
export async function sendContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  // Honeypot: pretend success so bots learn nothing; send nothing.
  if (input.website?.trim()) return "ok";

  const name = (input.name ?? "").trim().slice(0, 100);
  const email = input.email.trim();
  const message = input.message.trim();
  if (!EMAIL_RE.test(email) || message.length < 1 || message.length > 5000) {
    return "invalid";
  }

  if (rateLimited(input.ip)) return "rate_limited";

  const to = getContactEmail();
  const host = process.env.SMTP_HOST;
  if (!host || !to) {
    // Dev: no SMTP configured — log instead of sending (same as alerts email).
    console.log(`[contact dev] from=${email} name="${name}" message=${JSON.stringify(message)}`);
    return "ok";
  }

  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "contact@localhost",
      to,
      replyTo: email,
      subject: `[Asaar contact] ${name || email}`,
      html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`,
    });
    return "ok";
  } catch (err) {
    console.error("[contact] send failed:", err);
    return "send_failed";
  }
}
