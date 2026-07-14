"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AiActionState } from "./actions";

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
  action?: (state: AiActionState, formData: FormData) => Promise<AiActionState>;
  jobId: string;
  label: string;
  jobStatus: string;
  variant?: "default" | "outline";
};

const initialAiActionState: AiActionState = {
  status: "idle",
  message: "",
};

export function JobActionForm({ action, jobId, label, jobStatus, variant = "default" }: JobActionFormProps) {
  if (label === "İşle") {
    return <ProcessJobActionForm jobId={jobId} jobStatus={jobStatus} />;
  }
  if (!action) return null;

  return <ServerJobActionForm action={action} jobId={jobId} label={label} jobStatus={jobStatus} variant={variant} />;
}

function ServerJobActionForm({ action, jobId, label, jobStatus, variant }: Required<JobActionFormProps>) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialAiActionState);
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
    <form
      action={formAction}
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
  const processedSteps = useRef(0);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        console.log("[ai-translation] action.submit", { jobId, label: "İşle", jobStatus, at: new Date().toISOString() });
        window.dispatchEvent(new CustomEvent("ai-translation:process-loop", { detail: { active: true, jobId } }));
        stopRequested.current = false;
        processedSteps.current = 0;
        setPending(true);
        setStepCount(0);
        try {
          let steps = 0;
          let transientFailures = 0;
          while (!stopRequested.current) {
            let response: Response;
            const controller = new AbortController();
            const abortTimeout = setTimeout(() => controller.abort(), 22_000);
            try {
              response = await fetch("/api/admin/ai/process", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ jobId }),
                signal: controller.signal,
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
            } finally {
              clearTimeout(abortTimeout);
            }
            const state = await readProcessResponse(response);
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
            processedSteps.current = steps;
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
              showProcessLoopDoneToast(state, steps);
              break;
            }
            await sleep(1250);
          }
        } catch (error) {
          const serializedError = serializeClientError(error);
          console.warn("[ai-translation] process.client.stopped", { jobId, error: serializedError });
          toast.error("Çeviri işlemi durdu.", {
            description: clientErrorMessage(serializedError),
          });
        } finally {
          if (stopRequested.current) {
            toast.info("Çeviri işlemi durduruldu.", {
              description: processedSteps.current ? `${processedSteps.current} adım işlendi.` : "Yeni adım başlatılmadı.",
            });
          }
          setPending(false);
          stopRequested.current = false;
          window.dispatchEvent(new CustomEvent("ai-translation:process-loop", { detail: { active: false, jobId } }));
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

async function readProcessResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json().catch((error) => ({
      status: "error",
      message: `Yanıt JSON olarak okunamadı: ${error instanceof Error ? error.message : String(error)}`,
    })) as ProcessTranslationJobState;
  }

  const text = await response.text().catch(() => "");
  return {
    status: "error",
    message: text ? `JSON olmayan yanıt alındı: ${text.slice(0, 180)}` : `Boş yanıt alındı: HTTP ${response.status}`,
  } as ProcessTranslationJobState;
}

function serializeClientError(error: unknown) {
  if (error instanceof DOMException) {
    return { name: error.name, message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
    } catch {
      return { message: Object.prototype.toString.call(error) };
    }
  }
  return { message: String(error) };
}

function clientErrorMessage(error: ReturnType<typeof serializeClientError>) {
  return "message" in error && typeof error.message === "string" ? error.message : "Beklenmeyen bir hata oluştu.";
}

function showProcessLoopDoneToast(state: ProcessTranslationJobState | null, steps: number) {
  const description = state?.job
    ? `${state.job.completed}/${state.job.total} tamamlandı, hata ${state.job.failed}.`
    : `${steps} adım işlendi.`;

  if (state?.job?.status === "completed") {
    toast.success("Çeviri işi tamamlandı.", { description });
    return;
  }

  if (state?.job?.status === "paused") {
    toast.info("Çeviri işi durakladı.", { description });
    return;
  }

  if (state?.job?.status === "failed") {
    toast.error("Çeviri işi hata durumunda.", { description });
    return;
  }

  toast.success("Çeviri adımı tamamlandı.", { description });
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
  return Math.min(30_000, 5_000 * 2 ** Math.min(failures - 1, 3));
}

function SubmitButton({ label, variant }: { label: string; variant: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant === "default" ? "outline" : variant} disabled={pending}>
      {pending ? "İşleniyor..." : label}
    </Button>
  );
}
