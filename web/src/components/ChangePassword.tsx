"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  changePasswordAction,
  type ChangePwState,
} from "@/app/[locale]/account/actions";

export default function ChangePassword() {
  const t = useTranslations("account");
  const [state, dispatch] = useActionState<ChangePwState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form
      action={dispatch}
      className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3 max-w-sm"
    >
      <p className="font-medium">{t("changePassword")}</p>
      <input
        type="password"
        name="current"
        required
        placeholder={t("currentPassword")}
        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
      />
      <input
        type="password"
        name="next"
        required
        minLength={8}
        placeholder={t("newPassword")}
        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
      />
      {state?.error && (
        <p className="text-sm text-red-400">{t(`errors.${state.error}`)}</p>
      )}
      {state?.ok && <p className="text-sm text-green-400">{t("passwordChanged")}</p>}
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        {t("changePassword")}
      </button>
    </form>
  );
}
