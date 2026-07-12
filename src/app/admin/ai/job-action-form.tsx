"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ProcessTranslationJobState = {
  status: "success" | "error";
  message: string;
  jobId?: string;
  job?: {
    status: string;
    completed: number;
    failed: number;
    total: number;
    updatedAt: string;
  };
  activity?: Array<{
    title: string;
    status: string;
    attempts: number;
    error: string | null;
    updatedAt: string;
  }>;
};

type JobActionFormProps = {
  action?: (formData: FormData) => Promise<void>;
  jobId: string;
  label: string;
  jobStatus: string;
  variant?: "default" | "outline";
};

export function JobActionForm({ action, jobId, label, jobStatus, variant = "default" }: JobActionFormProps) {
  if (label === "İşle") {
    return <ProcessJobActionForm jobId={jobId} jobStatus={jobStatus} />;
  }
  if (!action) return null;

  return (
    <form
      action={action}
      onSubmit={() => {
        console.log("[ai-translation] action.submit", { jobId, label, jobStatus, at: new Date().toISOString() });
      }}
    >
      <input type="hidden" name="job_id" value={jobId} />
      <SubmitButton label={label} variant={variant} />
    </form>
  );
}

function ProcessJobActionForm({ jobId, jobStatus }: { jobId: string; jobStatus: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        console.log("[ai-translation] action.submit", { jobId, label: "İşle", jobStatus, at: new Date().toISOString() });
        setPending(true);
        try {
          const response = await fetch("/api/admin/ai/process", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jobId }),
          });
          const state = await response.json().catch(() => null) as ProcessTranslationJobState | null;
          console.groupCollapsed("[ai-translation] process.result");
          console.log(state ?? { status: "error", message: `HTTP ${response.status}` });
          if (state?.activity?.length) console.table(state.activity);
          console.groupEnd();
          if (!response.ok) throw new Error(state?.message || `HTTP ${response.status}`);
          router.refresh();
        } catch (error) {
          console.error("[ai-translation] process.client.failed", { jobId, error: error instanceof Error ? error.message : String(error) });
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "İşleniyor..." : "İşle"}
      </Button>
    </form>
  );
}

function SubmitButton({ label, variant }: { label: string; variant: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "İşleniyor..." : label}
    </Button>
  );
}
