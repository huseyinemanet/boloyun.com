"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AI_PROVIDER_LABELS, DEFAULT_AI_MODELS, type AiProviderConfig } from "@/lib/ai/types";
import { maskFingerprint } from "@/lib/ai/crypto";
import { submitAiProviderConfigAction, type AiActionState } from "./actions";

const initialAiActionState: AiActionState = {
  status: "idle",
  message: "",
};

export function ProviderConfigForm({ config }: { config: AiProviderConfig }) {
  const router = useRouter();
  const [state, formAction] = useActionState(submitAiProviderConfigAction, initialAiActionState);
  const lastToastKey = useRef("");

  useEffect(() => {
    if (state.status === "idle" || !state.message) return;

    const toastKey = `${state.status}:${state.message}`;
    if (lastToastKey.current === toastKey) return;
    lastToastKey.current = toastKey;

    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
      return;
    }

    toast.error(state.message);
  }, [router, state.message, state.status]);

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{AI_PROVIDER_LABELS[config.provider]}</h2>
        <Badge variant={config.enabled ? "default" : "outline"}>{config.enabled ? "Aktif" : "Pasif"}</Badge>
      </div>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{maskFingerprint(config.keyFingerprint)}</p>
      <p className="mt-1 text-xs text-muted-foreground">Test: {testStatusText(config)}</p>

      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="provider" value={config.provider} />
        <label className="grid gap-1 text-sm font-semibold">
          Model
          <Input name="model" defaultValue={config.model || DEFAULT_AI_MODELS[config.provider]} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          API Key
          <Input name="api_key" type="password" placeholder={config.hasApiKey ? "Mevcut key korunur" : "API key gir"} autoComplete="off" />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Checkbox name="enabled" defaultChecked={config.enabled} />
          Bu provider aktif olsun
        </label>
        <div className="grid grid-cols-2 gap-2">
          <SubmitButton name="intent" value="save" label="Kaydet" />
          <SubmitButton name="intent" value="test" label="Test Et" />
        </div>
      </form>
    </section>
  );
}

function SubmitButton({ name, value, label }: { name: string; value: string; label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" name={name} value={value} variant="outline" className="w-full" disabled={pending}>
      {pending ? "İşleniyor..." : label}
    </Button>
  );
}

function testStatusText(config: AiProviderConfig) {
  if (config.lastTestStatus === "success") return `Başarılı${config.lastTestAt ? `, ${formatDate(config.lastTestAt)}` : ""}`;
  if (config.lastTestStatus === "failed") return config.lastTestError || "Başarısız";
  return "Henüz test edilmedi";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
