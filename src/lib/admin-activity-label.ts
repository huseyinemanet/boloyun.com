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
    "category.sidebar_visibility.update": "Kategori menü görünürlüğü güncellendi",
    "category.reorder": "Kategori sıralaması güncellendi",
    "comment.status": "Yorum durumu değiştirildi",
    "comment.bulk_status": "Yorumlar toplu güncellendi",
    "comment.delete": "Yorum silindi",
    "comment.bulk_delete": "Yorumlar toplu silindi",
    "settings.save": "Ayarlar kaydedildi",
    "user.create": "Kullanıcı oluşturuldu",
    "user.update": "Kullanıcı güncellendi",
    "user.bulk_block": "Kullanıcılar engellendi",
    "user.bulk_unblock": "Kullanıcıların engeli kaldırıldı",
    "user.bulk_make_admin": "Yöneticilik yetkisi verildi",
    "user.bulk_make_member": "Kullanıcılar üyeye dönüştürüldü",
    "user.bulk_delete": "Kullanıcılar silindi",
  };
  return labels[action] ?? "Yönetim işlemi gerçekleştirildi";
}
