"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCommentAction } from "./actions";

export function CommentForm({ gameId, slug }: { gameId: string; slug: string }) {
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const trimmedLength = body.trim().length;
  const hasBodyError = submitted && (trimmedLength < 3 || trimmedLength > 1000);
  const errorId = "comment-body-error";

  return (
    <form
      action={createCommentAction}
      className="mt-4 space-y-3"
      onInvalidCapture={() => setSubmitted(true)}
      onSubmit={() => setSubmitted(true)}
    >
      <input type="hidden" name="game_id" value={gameId} />
      <input type="hidden" name="slug" value={slug} />
      <Textarea
        name="body"
        required
        minLength={3}
        maxLength={1000}
        rows={4}
        value={body}
        aria-invalid={hasBodyError}
        aria-describedby={hasBodyError ? errorId : undefined}
        placeholder="Bu oyun hakkındaki yorumunu yaz..."
        className="resize-y p-3 font-normal leading-6 placeholder:text-muted-foreground"
        onChange={(event) => setBody(event.target.value)}
      />
      {hasBodyError ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          Yorum 3 ile 1000 karakter arasında olmalı.
        </p>
      ) : null}
      <Button type="submit">Yorum Gönder</Button>
    </form>
  );
}
