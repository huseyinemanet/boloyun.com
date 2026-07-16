import type { Metadata } from "next";
import { ProviderConfigForm } from "@/app/admin/ai/provider-config-form";
import { listProviderConfigs } from "@/lib/ai/db-ai";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "AI Ayarları",
};

export default async function AiSettingsPage() {
  const configs = await listProviderConfigs();
  const deepSeekConfig = configs.find((config) => config.provider === "deepseek") ?? configs[0];

  return (
    <div className="space-y-3 pb-24">
      <div>
        <h2 className="text-lg font-semibold">AI Ayarları</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Toplu çeviri ve AI içerik işlemlerinin kullandığı sağlayıcı ayarını buradan yönet.
        </p>
      </div>

      {deepSeekConfig ? <ProviderConfigForm config={deepSeekConfig} /> : (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm font-semibold text-warning">
          AI sağlayıcı kaydı bulunamadı.
        </p>
      )}
    </div>
  );
}
