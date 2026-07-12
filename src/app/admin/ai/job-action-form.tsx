"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ProcessTranslationJobState = {
  status: "success" | "error";
  message: string;
  jobId?: string;
  processed?: number;
  failed?: number;
  continued?: boolean;
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
  const [pending, setPending] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const stopRequested = useRef(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        console.log("[ai-translation] action.submit", { jobId, label: "İşle", jobStatus, at: new Date().toISOString() });
        stopRequested.current = false;
        setPending(true);
        setStepCount(0);
        try {
          let steps = 0;
          let transientFailures = 0;
          while (!stopRequested.current) {
            let response: Response;
            try {
              response = await fetch("/api/admin/ai/process", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ jobId }),
              });
            } catch (error) {
              transientFailures += 1;
              const retryDelay = transientRetryDelay(transientFailures);
              console.warn("[ai-translation] process.transient_fetch_failed", {
                jobId,
                transientFailures,
                retryDelay,
                error: error instanceof Error ? error.message : String(error),
              });
              await sleep(retryDelay);
              continue;
            }
            const state = await response.json().catch(() => null) as ProcessTranslationJobState | null;
            if (!response.ok && isTransientStatus(response.status)) {
              transientFailures += 1;
              const retryDelay = transientRetryDelay(transientFailures);
              console.warn("[ai-translation] process.transient_http_failed", {
                jobId,
                status: response.status,
                transientFailures,
                retryDelay,
                state,
              });
              await sleep(retryDelay);
              continue;
            }
            transientFailures = 0;
            steps += 1;
            setStepCount(steps);
            console.groupCollapsed("[ai-translation] process.step.result");
            console.log(state ?? { status: "error", message: `HTTP ${response.status}` });
            if (state?.activity?.length) console.table(state.activity);
            console.groupEnd();
            if (!response.ok) throw new Error(state?.message || `HTTP ${response.status}`);
            if (state?.job) {
              window.dispatchEvent(new CustomEvent("ai-translation:jobs:patch", {
                detail: {
                  jobId,
                  status: state.job.status,
                  completedCount: state.job.completed,
                  failedCount: state.job.failed,
                  totalCount: state.job.total,
                  updatedAt: state.job.updatedAt,
                },
              }));
            }
            if (!shouldContinueProcessing(state)) {
              console.log("[ai-translation] process.loop.done", { jobId, steps, job: state?.job });
              break;
            }
            await sleep(500);
          }
        } catch (error) {
          console.error("[ai-translation] process.client.failed", { jobId, error: error instanceof Error ? error.message : String(error) });
        } finally {
          setPending(false);
          stopRequested.current = false;
        }
      }}
    >
      {pending ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            stopRequested.current = true;
            console.log("[ai-translation] process.loop.stop_requested", { jobId, stepCount, at: new Date().toISOString() });
          }}
        >
          {stepCount ? `Durdur (${stepCount})` : "Durdur"}
        </Button>
      ) : (
        <Button type="submit" size="sm" variant="outline">
          İşle
        </Button>
      )}
    </form>
  );
}

function shouldContinueProcessing(state: ProcessTranslationJobState | null) {
  if (typeof state?.continued === "boolean") return state.continued;
  const job = state?.job;
  if (!job) return false;
  if (job.status === "paused" || job.status === "cancelled" || job.status === "completed" || job.status === "failed") return false;
  return job.completed + job.failed < job.total;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status: number) {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function transientRetryDelay(failures: number) {
  return Math.min(30_000, 2_000 * 2 ** Math.min(failures - 1, 4));
}

function SubmitButton({ label, variant }: { label: string; variant: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant === "default" ? "outline" : variant} disabled={pending}>
      {pending ? "İşleniyor..." : label}
    </Button>
  );
}
