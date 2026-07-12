"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type JobActionFormProps = {
  action: (formData: FormData) => Promise<void>;
  jobId: string;
  label: string;
  jobStatus: string;
  variant?: "default" | "outline";
};

export function JobActionForm({ action, jobId, label, jobStatus, variant = "default" }: JobActionFormProps) {
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

function SubmitButton({ label, variant }: { label: string; variant: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "İşleniyor..." : label}
    </Button>
  );
}
