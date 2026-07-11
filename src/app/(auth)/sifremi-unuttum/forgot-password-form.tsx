"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotProtectionFields } from "@/components/security/bot-protection-fields";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { sent: false };

export function ForgotPasswordForm({ challenge }: { challenge: boolean }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);
  return (
    <>
      {state.sent ? <p role="status" className="mt-3 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">Şifre yenileme bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.</p> : null}
      <form action={action} className="mt-4 space-y-3">
        <BotProtectionFields challenge={challenge} action="recovery" />
        <label className="block text-sm font-bold">
          E-posta
          <Input name="email" type="email" autoComplete="email" required disabled={pending} className="mt-1 h-10" />
        </label>
        <Button disabled={pending} aria-disabled={pending} className="h-10 w-full px-4 text-sm font-black">{pending ? "Gönderiliyor…" : "Şifre Bağlantısı Gönder"}</Button>
      </form>
    </>
  );
}
