"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { GameImportStatus } from "@/import/db/game-imports";

export function ImportReviewActions({ formId, status }: { formId: string; status: GameImportStatus }) {
  if (status === "approved") return null;
  if (status === "failed") return <Button form={formId} type="submit" name="intent" value="retry">Yeniden İşle</Button>;
  if (status === "rejected") return <Button form={formId} type="submit" name="intent" value="reopen">İncelemeye Geri Al</Button>;

  return <ButtonGroup aria-label="Import işlemleri">
    <Button form={formId} type="submit" name="intent" value="save" variant="outline">Kaydet</Button>
    <ButtonGroupSeparator />
    <ConfirmAction formId={formId} intent="regenerate" label="AI Yenile" title="AI içeriği yeniden üretilsin mi?" description="Mevcut Türkçe içerik alanları yeni AI çıktısıyla değiştirilecek." variant="outline" />
    <ButtonGroupSeparator />
    <Button form={formId} type="submit" name="intent" value="needs_fix" variant="outline">Düzeltmeye Gönder</Button>
    <ButtonGroupSeparator />
    <ConfirmAction formId={formId} intent="reject" label="Reddet" title="Import reddedilsin mi?" description="Kayıt reddedilenler arşivine taşınacak. İşlem için gerekçe alanı zorunludur." variant="destructive" />
    <ButtonGroupSeparator />
    <ConfirmAction formId={formId} intent="approve" label="Onayla ve Yayınla" title="Oyun yayınlansın mı?" description="İçerik doğrulanacak, kapak CDN’e aktarılacak ve oyun public sitede yayınlanacak." variant="default" />
  </ButtonGroup>;
}

function ConfirmAction({ formId, intent, label, title, description, variant }: { formId: string; intent: string; label: string; title: string; description: string; variant: "default" | "outline" | "destructive" }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button type="button" variant={variant}>{label}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
        <AlertDialogAction form={formId} type="submit" name="intent" value={intent} variant={variant}>Devam Et</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
