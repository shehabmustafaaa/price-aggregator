"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  submitContactAction,
  type ContactState,
} from "@/app/[locale]/contact/actions";

export default function ContactForm({
  fallbackEmail,
}: {
  fallbackEmail: string;
}) {
  const t = useTranslations("contact");
  const [state, dispatch, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    undefined,
  );

  if (state?.result === "ok") {
    return (
      <p className="rounded-lg border border-green-800 bg-green-950/50 p-4 text-sm text-green-300">
        {t("success")}
      </p>
    );
  }

  const error =
    state?.result === "invalid"
      ? t("invalid")
      : state?.result === "rate_limited"
        ? t("rate_limited")
        : state?.result === "send_failed"
          ? t("send_failed", { email: fallbackEmail })
          : null;

  return (
    <form action={dispatch} className="space-y-3 max-w-md">
      <input
        name="name"
        type="text"
        maxLength={100}
        placeholder={t("name")}
        defaultValue={state?.values?.name}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder={t("email")}
        defaultValue={state?.values?.email}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
      />
      <textarea
        name="message"
        required
        rows={6}
        maxLength={5000}
        placeholder={t("message")}
        defaultValue={state?.values?.message}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
      />
      {/* Honeypot — hidden from real users, bots fill it */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
