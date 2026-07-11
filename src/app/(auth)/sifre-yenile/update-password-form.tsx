"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function UpdatePasswordForm({ supabaseUrl, supabaseAnonKey }: { supabaseUrl: string; supabaseAnonKey: string }) {
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient({ url: supabaseUrl, anonKey: supabaseAnonKey });
    async function establishRecoverySession() {
      await Promise.resolve();
      if (!supabase) { setError("Üyelik sistemi yapılandırılmamış."); return; }
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) { setError("Şifre yenileme bağlantısı geçersiz veya süresi dolmuş."); return; }
        setEmail(data.user?.email ?? "");
        window.history.replaceState({}, "", window.location.pathname);
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email ?? "");
      if (data.session) setReady(true);
      else setError("Şifre yenileme bağlantısı geçersiz veya süresi dolmuş.");
    }
    void establishRecoverySession();
  }, [supabaseAnonKey, supabaseUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) { setError("Şifre en az 8 karakter olmalı."); return; }
    setPending(true);
    setError("");
    const supabase = createSupabaseBrowserClient({ url: supabaseUrl, anonKey: supabaseAnonKey });
    const { error: updateError } = supabase ? await supabase.auth.updateUser({ password }) : { error: new Error("config") };
    if (updateError) { setError("Şifre güncellenemedi. Farklı ve güçlü bir şifre deneyin."); setPending(false); return; }
    await supabase?.auth.signOut();
    window.location.assign("/giris?notice=password-updated");
  }

  return (
    <>
      {error ? <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p> : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input type="email" name="username" autoComplete="username" value={email} readOnly className="sr-only" tabIndex={-1} aria-hidden="true" />
        <label className="block text-sm font-bold">Yeni şifre<Input name="password" type="password" autoComplete="new-password" required minLength={8} disabled={!ready || pending} className="mt-1 h-10" /></label>
        <Button disabled={!ready || pending} className="h-10 w-full px-4 text-sm font-black">{pending ? "Güncelleniyor…" : "Şifreyi Güncelle"}</Button>
      </form>
    </>
  );
}
