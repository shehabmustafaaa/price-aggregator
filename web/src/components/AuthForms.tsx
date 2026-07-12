"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  loginAction,
  registerAction,
  type AuthState,
} from "@/app/[locale]/account/actions";

export default function AuthForms({ locale }: { locale: string }) {
  const t = useTranslations("account");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginDispatch] = useActionState<AuthState, FormData>(
    loginAction,
    undefined,
  );
  const [regState, regDispatch] = useActionState<AuthState, FormData>(
    registerAction,
    undefined,
  );

  const state = mode === "login" ? loginState : regState;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "login" ? "bg-blue-600 text-white" : "border border-gray-700"}`}
        >
          {t("login")}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-lg px-3 py-1.5 text-sm ${mode === "register" ? "bg-blue-600 text-white" : "border border-gray-700"}`}
        >
          {t("register")}
        </button>
      </div>

      <form
        action={mode === "login" ? loginDispatch : regDispatch}
        className="space-y-3"
      >
        <input type="hidden" name="locale" value={locale} />
        <input
          type="email"
          name="email"
          required
          placeholder={t("email")}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder={t("password")}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
        />
        {state?.error && (
          <p className="text-sm text-red-400">{t(`errors.${state.error}`)}</p>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {mode === "login" ? t("login") : t("register")}
        </button>
      </form>
    </div>
  );
}
