"use server";

import { headers } from "next/headers";
import { sendContactMessage, type ContactResult } from "@/lib/contact/send";

export type ContactState =
  | {
      result: ContactResult;
      values?: { name: string; email: string; message: string };
    }
  | undefined;

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");
  const message = String(formData.get("message") || "");

  const result = await sendContactMessage({
    name,
    email,
    message,
    website: String(formData.get("website") || ""),
    ip,
  });

  // Preserve inputs so the form can re-fill them on error.
  return result === "ok"
    ? { result }
    : { result, values: { name, email, message } };
}
