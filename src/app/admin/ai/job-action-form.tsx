"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { processTranslationJobStateAction, type ProcessTranslationJobState } from "./actions";

const initialProcessTranslationJobState: ProcessTranslationJobState = {
  status: "idle",
  message: "",
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
  const [state, formAction] = useActionState(processTranslationJobStateAction, initialProcessTranslationJobState);

  useEffect(() => {
    if (state.status === "idle") return;
    console.groupCollapsed("[ai-translation] process.result");
    console.log(state);
    if (state.activity?.length) console.table(state.activity);
    console.groupEnd();
    router.refresh();
  }, [router, state]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        console.log("[ai-translation] action.submit", { jobId, label: "İşle", jobStatus, at: new Date().toISOString() });
      }}
    >
      <input type="hidden" name="job_id" value={jobId} />
      <SubmitButton label="İşle" variant="default" />
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
