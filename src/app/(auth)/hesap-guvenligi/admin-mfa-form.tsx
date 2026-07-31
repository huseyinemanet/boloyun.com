"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Enrollment = {
  factorId: string;
  qrCodeUrl: string;
  secret: string;
};

export function AdminMfaForm({ next, verifiedFactorId }: { next: string; verifiedFactorId: string | null }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function startEnrollment() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Üyelik sistemi yapılandırılmamış.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      for (const factor of factors.data.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw removed.error;
      }

      const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Bol Oyun Admin" });
      if (result.error) throw result.error;
      if (result.data.type !== "totp") throw new Error("TOTP kurulumu başlatılamadı.");

      const qrCodeUrl = result.data.totp.qr_code.startsWith("data:")
        ? result.data.totp.qr_code
        : `data:image/svg+xml;utf-8,${encodeURIComponent(result.data.totp.qr_code)}`;
      setEnrollment({ factorId: result.data.id, qrCodeUrl, secret: result.data.totp.secret });
    } catch {
      setError("İki aşamalı doğrulama kurulumu başlatılamadı. Lütfen tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const factorId = verifiedFactorId ?? enrollment?.factorId;
    if (!factorId || !/^\d{6,8}$/.test(code)) {
      setError("Doğrulama uygulamasındaki geçerli kodu gir.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Üyelik sistemi yapılandırılmamış.");
      return;
    }

    setBusy(true);
    setError("");
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (result.error) {
      setError("Kod doğrulanamadı veya süresi doldu. Yeni kodu deneyin.");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  if (!verifiedFactorId && !enrollment) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Google Authenticator, 1Password veya benzeri bir TOTP uygulaması kullanabilirsin.
        </p>
        {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}
        <Button type="button" className="w-full" onClick={startEnrollment} disabled={busy}>
          {busy ? "Kurulum hazırlanıyor…" : "İki Aşamalı Güvenliği Kur"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      {enrollment ? (
        <div className="space-y-3 rounded-lg border bg-background p-4 text-center">
          <Image src={enrollment.qrCodeUrl} alt="TOTP kurulum QR kodu" width={200} height={200} unoptimized className="mx-auto rounded-md" />
          <p className="text-xs text-muted-foreground">QR kodu tarayamıyorsan bu anahtarı uygulamana elle gir:</p>
          <code className="block break-all rounded bg-muted p-2 text-xs font-semibold">{enrollment.secret}</code>
        </div>
      ) : null}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="admin-mfa-code">Doğrulama kodu</FieldLabel>
          <Input
            id="admin-mfa-code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={8}
            required
            aria-invalid={Boolean(error)}
          />
          <FieldDescription>Kod yaklaşık 30 saniyede bir yenilenir.</FieldDescription>
        </Field>
      </FieldGroup>
      {error ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Doğrulanıyor…" : "Doğrula ve Admin Paneline Gir"}
      </Button>
    </form>
  );
}
