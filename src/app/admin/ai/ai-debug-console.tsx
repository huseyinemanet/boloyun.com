"use client";

import { useEffect } from "react";
import type { AiTranslationActivity, AiTranslationJob } from "@/lib/ai/types";

export function AiDebugConsole({ jobs, activity }: { jobs: AiTranslationJob[]; activity: AiTranslationActivity[] }) {
  useEffect(() => {
    console.groupCollapsed("[ai-translation] dashboard snapshot");
    console.table(jobs.map((job) => ({
      id: job.id,
      provider: job.provider,
      model: job.model,
      status: job.status,
      completed: job.completedCount,
      failed: job.failedCount,
      total: job.totalCount,
      updatedAt: job.updatedAt,
    })));
    console.table(activity.map((item) => ({
      id: item.id,
      jobId: item.jobId,
      title: item.title,
      status: item.status,
      attempts: item.attempts,
      error: item.errorMessage,
      updatedAt: item.updatedAt,
    })));
    console.groupEnd();
  }, [jobs, activity]);

  return null;
}
