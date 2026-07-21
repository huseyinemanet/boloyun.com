"use client";

import { useState } from "react";
import { CircleCheckBigIcon, FlagIcon, LoaderCircleIcon } from "@/components/icons/app-icons";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { gameReportReasonLabels, gameReportReasons, type GameReportReason } from "@/lib/game-report-validation";

type SubmitState = "idle" | "sending" | "sent" | "duplicate" | "error";

export function GameReportDialog({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<GameReportReason>("broken");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  async function submitReport() {
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/game-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId, reason, details }),
      });
      const payload = await response.json() as { alreadyReported?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Bildirim gönderilemedi.");
      setState(payload.alreadyReported ? "duplicate" : "sent");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Bildirim gönderilemedi.");
      setState("error");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && state !== "sending") {
      setState("idle");
      setError("");
    }
  }

  const isComplete = state === "sent" || state === "duplicate";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/25 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">Oyun çalışmıyor mu?</p>
        <p className="text-xs leading-5 text-muted-foreground">Bize bildir, kontrol edip düzeltelim.</p>
      </div>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <FlagIcon data-icon="inline-start" />
            Oyunu Bildir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className={isComplete ? "bg-success/10 text-success" : undefined}>
              {isComplete ? <CircleCheckBigIcon /> : <FlagIcon />}
            </AlertDialogMedia>
            <AlertDialogTitle>{isComplete ? "Bildirimin bize ulaştı" : "Oyundaki sorunu bildir"}</AlertDialogTitle>
            <AlertDialogDescription>
              {state === "duplicate"
                ? `${gameTitle} için daha önce gönderdiğin bildirim inceleme kuyruğunda.`
                : state === "sent"
                  ? `Teşekkürler. ${gameTitle} için gönderdiğin bildirimi kontrol edeceğiz.`
                  : "Karşılaştığın sorunu seç. Bildirimin yönetici inceleme kuyruğuna eklenecek."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!isComplete ? (
            <div className="space-y-3 text-left">
              <label className="grid gap-1.5 text-sm font-semibold">
                Sorun nedir?
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as GameReportReason)}
                  disabled={state === "sending"}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {gameReportReasons.map((value) => <option key={value} value={value}>{gameReportReasonLabels[value]}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Eklemek istediğin bir not var mı? <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
                <Textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value.slice(0, 500))}
                  disabled={state === "sending"}
                  placeholder="Örneğin: Oyunu başlattığımda siyah ekran kalıyor..."
                  rows={3}
                  className="font-normal"
                />
              </label>
              {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
            </div>
          ) : null}

          <AlertDialogFooter className={isComplete ? "grid-cols-1" : undefined}>
            {isComplete ? (
              <AlertDialogCancel>Tamam</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel disabled={state === "sending"}>Vazgeç</AlertDialogCancel>
                <Button type="button" onClick={submitReport} disabled={state === "sending"}>
                  {state === "sending" ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
                  {state === "sending" ? "Gönderiliyor..." : "Bildirimi Gönder"}
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
