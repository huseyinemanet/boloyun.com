export function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "import.save": "Import güncellendi",
    "import.regenerate": "AI içeriği yenilendi",
    "import.retry": "Import yeniden işlendi",
    "import.needs_fix": "Import düzeltmeye gönderildi",
    "import.reject": "Import reddedildi",
    "import.reopen": "Import yeniden açıldı",
    "import.approve": "Import yayınlandı",
    "crawler.run": "Oyun taraması tamamlandı",
    "game.update": "Oyun güncellendi",
    "game.export": "Oyunlar dışa aktarıldı",
    "comment.status": "Yorum durumu değiştirildi",
    "comment.bulk_status": "Yorumlar toplu güncellendi",
    "settings.save": "Ayarlar kaydedildi",
    "user.update": "Kullanıcı güncellendi",
    "user.bulk_make_admin": "Yöneticilik yetkisi verildi",
    "user.bulk_delete": "Kullanıcılar silindi",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}
