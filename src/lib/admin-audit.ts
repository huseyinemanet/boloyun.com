import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export async function recordAdminAudit(input: {
  actorProfileId: string;
  action: string;
  targetType: string;
  targetIds?: string[];
  details?: Record<string, string | number | boolean | null>;
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase service client yok.");
  const { error } = await supabase.from("admin_audit_events").insert({
    actor_profile_id: input.actorProfileId,
    action: input.action,
    target_type: input.targetType,
    target_ids: input.targetIds ?? [],
    details: input.details ?? {},
  });
  if (error) throw new Error(`Yönetici denetim kaydı yazılamadı: ${error.message}`);
}
