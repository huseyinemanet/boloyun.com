"use client";

import { BookOpenTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const guidelines = [
  { title: "Saygılı ol", description: "Küfür, hakaret, tehdit, zorbalık veya başka oyuncuları hedef alan aşağılayıcı ifadeler kullanma." },
  { title: "Oyun hakkında konuş", description: "Yorumunu oynadığın oyunla ilgili tut. Tekrarlanan mesajlar, reklamlar, yönlendirme bağlantıları ve spam paylaşma." },
  { title: "Kişisel bilgilerini koru", description: "Telefon numarası, adres, e-posta, parola, okul veya gerçek ad-soyad gibi seni tanımlayabilecek bilgileri yazma." },
  { title: "Güvenli içerik paylaş", description: "Nefret söylemi, ayrımcılık, cinsel içerik, aşırı şiddet veya yasa dışı davranışları özendiren içerikler paylaşma." },
  { title: "Başkalarının deneyimini bozma", description: "Oyunun önemli sürprizlerini açık edeceksen yorumunun başında belirgin biçimde “Spoiler” uyarısı kullan." },
];

export function CommentGuidelinesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
          <BookOpenTextIcon data-icon="inline-start" />
          Yorum kuralları
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(85dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle>Yorum kuralları</DialogTitle>
          <DialogDescription>Herkes için güvenli, yararlı ve keyifli bir yorum alanı oluşturmamıza yardımcı ol.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          <ol className="space-y-4">
            {guidelines.map((guideline, index) => (
              <li key={guideline.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">{index + 1}</span>
                <div><h3 className="font-semibold text-foreground">{guideline.title}</h3><p className="mt-1 leading-6 text-muted-foreground">{guideline.description}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-md border border-border bg-muted/40 p-3">
            <h3 className="font-semibold text-foreground">Yorumlar nasıl yayınlanır?</h3>
            <p className="mt-1 leading-6 text-muted-foreground">Yorumlar yayınlanmadan önce incelenir. Kurallara uymayan yorumlar reddedilebilir veya sonradan kaldırılabilir; tekrarlanan ihlaller hesap kullanımını sınırlandırabilir.</p>
          </div>
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-none px-4 py-3"><DialogClose asChild><Button type="button" variant="secondary">Kuralları anladım</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
