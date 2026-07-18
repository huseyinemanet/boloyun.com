import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedStaticPage, readStaticPageDocument } from "@/lib/db-static-pages";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { staticPageInlineMarkupToHtml } from "@/lib/static-page-inline-format";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export type StaticPageContent = {
  title: string;
  description: string;
  updatedAt: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
};

const legacySlugs: Record<string, string> = {
  "terms-of-service": "kullanim-sartlari",
  "privacy-policy": "gizlilik-politikasi",
  "cookie-policy": "cerez-politikasi",
  "dmca-copyright": "telif-hakki",
  contact: "iletisim",
  about: "hakkimizda",
  advertising: "reklam",
};

export const pages: Record<string, StaticPageContent> = {
  "kullanim-sartlari": {
    title: "Kullanım Şartları",
    description: "Bol Oyun web sitesini kullanırken geçerli olan temel kurallar, kullanıcı sorumlulukları ve hizmet koşulları.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Genel hükümler",
        paragraphs: [
          "Bol Oyun, boloyun.com alan adı üzerinden yayın yapan Türkçe bir mini oyun portalıdır. Siteyi ziyaret ederek, oyun sayfalarını açarak, yorum göndererek veya favori gibi kullanıcı özelliklerini kullanarak bu kullanım şartlarını kabul etmiş sayılırsınız.",
          "Bu şartlar, sitenin güvenli, anlaşılır ve herkes için keyifli kalmasını sağlamak amacıyla hazırlanmıştır. Şartları kabul etmiyorsanız siteyi kullanmayı durdurabilirsiniz.",
        ],
      },
      {
        heading: "Hizmetin kapsamı",
        paragraphs: [
          "Bol Oyun; iframe, HTML5, harici bağlantı ve Ruffle ile çalışan eski Flash oyunları keşfetmenizi ve tarayıcı üzerinden oynamanızı sağlar. Bazı oyunlar üçüncü taraf kaynaklardan gömülü olarak sunulabilir veya ilgili kaynağa yönlendirebilir.",
          "Oyunların erişilebilirliği, performansı ve teknik uyumluluğu kaynak siteye, tarayıcınıza, cihazınıza ve bağlantı koşullarınıza göre değişebilir. Bir oyunun her zaman kesintisiz çalışacağını garanti etmiyoruz.",
        ],
      },
      {
        heading: "Kullanıcı davranışı",
        paragraphs: [
          "Yorum, puanlama, favori ve profil özelliklerini kullanırken hukuka, genel ahlaka ve diğer kullanıcıların haklarına uygun davranmanız gerekir. Hakaret, tehdit, nefret söylemi, kişisel veri paylaşımı, spam veya zararlı bağlantı içeren içerikler kaldırılabilir.",
          "Siteye zarar verebilecek otomatik istekler, güvenlik açığı denemeleri, tersine mühendislik girişimleri veya hizmeti olağan kullanım amacı dışında zorlayan davranışlar yasaktır.",
        ],
      },
      {
        heading: "Hesaplar",
        paragraphs: [
          "Kullanıcı hesabı özellikleri Google ile giriş, favoriler, son oynanan oyunlar, yorumlar, puanlar ve basit profil alanlarıyla sınırlıdır. Hesabınızla yapılan işlemlerin sorumluluğu size aittir.",
          "Kuralları ihlal eden hesapların yorumları gizlenebilir, kullanıcı adı değiştirilebilir veya hesabın belirli özelliklere erişimi sınırlandırılabilir.",
        ],
      },
      {
        heading: "Fikri mülkiyet ve oyun kaynakları",
        paragraphs: [
          "Bol Oyun markası, site tasarımı, Türkçe açıklama metinleri, sınıflandırmalar ve editoryal içerikler Bol Oyun'a aittir veya Bol Oyun tarafından kullanım hakkı kapsamında yayınlanır.",
          "Oyunların marka, görsel, ses, kod ve diğer varlıkları ilgili hak sahiplerine ait olabilir. Hak sahibi olduğunuz bir içeriğin sitede hatalı veya izinsiz yer aldığını düşünüyorsanız Telif Hakkı sayfasındaki bildirim sürecini kullanabilirsiniz.",
        ],
      },
      {
        heading: "Sorumluluk sınırı",
        paragraphs: [
          "Bol Oyun'u olduğu gibi sunuyoruz. Oyunların üçüncü taraf kaynaklarından gelen içerikleri, harici bağlantıları, reklamları veya teknik sorunları üzerinde her zaman tam kontrolümüz olmayabilir.",
          "Siteyi kullanmanızdan doğabilecek dolaylı zararlar, veri kaybı, cihaz uyumsuzluğu veya üçüncü taraf hizmetlerden kaynaklanan sorunlar için, yürürlükteki hukukun izin verdiği ölçüde sorumluluk kabul etmiyoruz.",
        ],
      },
      {
        heading: "Değişiklikler",
        paragraphs: [
          "Bu şartları zaman zaman güncelleyebiliriz. Önemli değişikliklerde sayfanın güncellenme tarihini yenileriz. Siteyi kullanmaya devam etmeniz güncel şartları kabul ettiğiniz anlamına gelir.",
        ],
      },
    ],
  },
  "gizlilik-politikasi": {
    title: "Gizlilik Politikası",
    description: "Bol Oyun'un kişisel verileri nasıl topladığı, kullandığı, sakladığı ve koruduğu hakkında açıklamalar.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Kapsam",
        paragraphs: [
          "Bu gizlilik politikası, boloyun.com üzerindeki ziyaretçi ve kullanıcı verilerinin nasıl işlendiğini açıklar. Amacımız, mini oyun deneyimini hızlı, güvenli ve kişiselleştirilebilir hale getirirken gereksiz veri toplamamaktır.",
          "Bol Oyun'u yalnızca oyun keşfetmek ve oynamak için kullanıyorsanız sınırlı teknik veriler işlenir. Google ile giriş, favoriler, yorumlar veya puanlama gibi özellikleri kullanırsanız hesapla ilişkili ek veriler oluşur.",
        ],
      },
      {
        heading: "Topladığımız bilgiler",
        paragraphs: [
          "Ziyaret sırasında IP adresi, tarayıcı türü, cihaz bilgisi, ziyaret edilen sayfalar, yönlendiren adres, hata kayıtları ve güvenlik günlükleri gibi teknik veriler işlenebilir.",
          "Google ile giriş yaptığınızda e-posta adresiniz, Google hesabınızdan gelen temel profil bilgileri, seçtiğiniz kullanıcı adı, favori oyunlarınız, son oynadığınız oyunlar, yorumlarınız ve puanlarınız saklanabilir.",
        ],
      },
      {
        heading: "Verileri kullanma amaçlarımız",
        paragraphs: [
          "Verileri hesabınızı oluşturmak, favori ve son oynanan oyunları göstermek, yorumları yönetmek, kötüye kullanımı önlemek, site performansını ölçmek, güvenliği sağlamak ve yasal yükümlülükleri yerine getirmek için kullanırız.",
          "Oyun önerileri, kategori düzeni ve arama deneyimi gibi ürün iyileştirmelerinde toplu ve istatistiksel verilerden yararlanabiliriz. Bu çalışmalar kullanıcıları tek tek hedeflemekten çok site deneyimini iyileştirmeye yöneliktir.",
        ],
      },
      {
        heading: "Çerezler ve benzer teknolojiler",
        paragraphs: [
          "Oturumunuzu korumak, tercihlerinizi hatırlamak, güvenliği sağlamak, reklam ve ölçüm sistemlerini çalıştırmak için çerezler kullanılabilir. Çerezlerle ilgili ayrıntılar Çerez Politikası sayfasında açıklanır.",
        ],
      },
      {
        heading: "Üçüncü taraf hizmetler",
        paragraphs: [
          "Bol Oyun; Google giriş hizmetleri, Supabase altyapısı, Cloudflare servisleri, reklam sağlayıcıları, ölçüm araçları ve oyunların yayınlandığı üçüncü taraf kaynaklarla çalışabilir.",
          "Üçüncü taraf oyunlar veya reklamlar kendi gizlilik politikalarına sahip olabilir. Harici bir bağlantıya geçtiğinizde veya gömülü üçüncü taraf içeriğiyle etkileşime girdiğinizde ilgili sağlayıcının kuralları geçerli olabilir.",
        ],
      },
      {
        heading: "Veri saklama ve güvenlik",
        paragraphs: [
          "Verileri yalnızca gerekli olduğu sürece saklarız. Hesap verileri hesabınız açık kaldığı sürece, yorum ve moderasyon kayıtları ise güvenlik ve topluluk düzeni için makul sürelerle tutulabilir.",
          "Yetkisiz erişimi önlemek için erişim kontrolleri, veritabanı güvenlik kuralları ve altyapı düzeyinde korumalar kullanırız. İnternet üzerinden hiçbir aktarımın tamamen risksiz olmadığını da bilmenizi isteriz.",
        ],
      },
      {
        heading: "Haklarınız",
        paragraphs: [
          "Kişisel verileriniz hakkında bilgi alma, düzeltme, silme, işleme itiraz etme ve hesabınızla ilişkili verilerin kaldırılmasını isteme haklarınız olabilir.",
          "Bu hakları kullanmak için iletisim@boloyun.com adresinden bize ulaşabilirsiniz. Talebinizi değerlendirebilmemiz için hesabınıza bağlı e-posta adresinden yazmanız gerekebilir.",
        ],
      },
    ],
  },
  "cerez-politikasi": {
    title: "Çerez Politikası",
    description: "Bol Oyun'da kullanılan çerez türleri, kullanım amaçları ve çerez tercihlerinizi nasıl yönetebileceğiniz.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Çerez nedir?",
        paragraphs: [
          "Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. Bol Oyun'da çerezler siteyi güvenli çalıştırmak, oturumları korumak, tercihleri hatırlamak ve deneyimi geliştirmek için kullanılır.",
        ],
      },
      {
        heading: "Zorunlu çerezler",
        paragraphs: [
          "Zorunlu çerezler giriş oturumunun korunması, güvenlik kontrolleri, yönetici paneli erişimi ve temel site işlevleri için gereklidir. Bu çerezler olmadan site doğru şekilde çalışmayabilir.",
        ],
      },
      {
        heading: "Tercih ve deneyim çerezleri",
        paragraphs: [
          "Favoriler, son oynanan oyunlar, kullanıcı tercihleri veya oyun deneyimini etkileyen seçimler için çerezler ya da benzer yerel depolama yöntemleri kullanılabilir.",
          "Bu veriler, Bol Oyun'u tekrar ziyaret ettiğinizde kaldığınız yerden devam etmenizi ve daha hızlı oyun bulmanızı kolaylaştırır.",
        ],
      },
      {
        heading: "Analitik ve performans çerezleri",
        paragraphs: [
          "Site hızını, popüler sayfaları, hata durumlarını ve genel kullanım eğilimlerini anlamak için analitik araçlar kullanılabilir. Bu veriler siteyi daha hızlı ve kullanışlı hale getirmek için değerlendirilir.",
        ],
      },
      {
        heading: "Reklam çerezleri",
        paragraphs: [
          "Bol Oyun reklamlarla desteklenebilir. Reklam sağlayıcıları reklam gösterimi, sıklık sınırı, cihaz türü ve performans ölçümü için çerez kullanabilir.",
          "Oyun oynama alanının gereksiz şekilde bölünmemesi için reklam yerleşimlerini dikkatli kullanmaya çalışırız. Mobil yapışkan reklamlar oyun aktifken gizlenebilir.",
        ],
      },
      {
        heading: "Çerezleri yönetme",
        paragraphs: [
          "Tarayıcı ayarlarınızdan çerezleri silebilir, engelleyebilir veya belirli siteler için izinleri değiştirebilirsiniz. Çerezleri tamamen kapatırsanız giriş, favoriler ve bazı oyun deneyimi özellikleri beklediğiniz gibi çalışmayabilir.",
        ],
      },
    ],
  },
  "telif-hakki": {
    title: "DMCA / Telif Hakkı",
    description: "Bol Oyun'da yer alan oyun, görsel veya metinlerle ilgili telif hakkı bildirim süreci.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Telif haklarına saygı",
        paragraphs: [
          "Bol Oyun, oyun geliştiricilerinin, yayıncıların, marka sahiplerinin ve içerik üreticilerinin haklarına saygı duyar. Sitede yer alan oyunlar, görseller, başlıklar veya bağlantılarla ilgili hak ihlali olduğunu düşünüyorsanız bildiriminizi incelemeye alırız.",
        ],
      },
      {
        heading: "Bildirim için gerekli bilgiler",
        paragraphs: [
          "Telif hakkı bildirimi gönderirken lütfen hak sahibi olduğunuz eseri, ihlal edildiğini düşündüğünüz Bol Oyun URL'sini, hak sahipliğinizi gösteren açıklamayı, iletişim bilgilerinizi ve iyi niyetli beyanınızı ekleyin.",
          "Eksik bilgi içeren bildirimler daha uzun sürede değerlendirilebilir. Yanlış veya kötü niyetli bildirimlerin hukuki sonuçları olabileceğini unutmayın.",
        ],
      },
      {
        heading: "Bildirim adresi",
        paragraphs: [
          "Telif hakkı ve kaldırma talepleri için telif@boloyun.com adresine yazabilirsiniz. Konu satırına ilgili oyun adını ve 'Telif Bildirimi' ifadesini eklemeniz süreci hızlandırır.",
        ],
      },
      {
        heading: "İnceleme süreci",
        paragraphs: [
          "Geçerli bir bildirim aldığımızda ilgili içeriği, kaynak bağlantısını ve teknik kayıtları inceleriz. Gerekli görürsek içeriği kaldırabilir, erişimi sınırlandırabilir, oyun kaydını yayından alabilir veya kaynak bilgisini düzeltebiliriz.",
          "Bazı oyunlar üçüncü taraf sitelerden gömülü olarak çalışabilir. Böyle durumlarda ihlalin asıl kaynağı üçüncü taraf yayıncı olabilir; yine de Bol Oyun üzerindeki erişimi makul şekilde yönetiriz.",
        ],
      },
      {
        heading: "Karşı bildirim",
        paragraphs: [
          "Bir içeriğin hatalı şekilde kaldırıldığını düşünüyorsanız karşı bildirim gönderebilirsiniz. Karşı bildirimde kimliğinizi, kaldırılan içeriği, gerekçenizi ve sizinle iletişime geçilebilecek bilgileri açıkça belirtmeniz gerekir.",
        ],
      },
    ],
  },
  iletisim: {
    title: "İletişim",
    description: "Bol Oyun ile destek, iş birliği, reklam ve telif konularında iletişime geçme yolları.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Bize ulaşın",
        paragraphs: [
          "Bol Oyun hakkında öneri, hata bildirimi, içerik düzeltme talebi, reklam görüşmesi veya genel sorularınız için iletisim@boloyun.com adresine yazabilirsiniz.",
          "Mesajınızda ilgili sayfa bağlantısını, oyun adını ve sorunu kısa ama net şekilde belirtmeniz bize yardımcı olur. Oyun açılmıyorsa tarayıcı, cihaz ve mümkünse ekran görüntüsü bilgisi ekleyebilirsiniz.",
        ],
      },
      {
        heading: "Destek konuları",
        paragraphs: [
          "Açılmayan oyunlar, yanlış kategori, hatalı açıklama, uygunsuz yorum, hesap erişimi, favoriler, reklam yerleşimleri ve telif bildirimleri için e-posta üzerinden destek veriyoruz.",
          "Telif hakkı talepleri için mümkün olduğunda telif@boloyun.com adresini kullanın. Reklam ve marka iş birlikleri için reklam@boloyun.com adresine yazabilirsiniz.",
        ],
      },
      {
        heading: "Yanıt süresi",
        paragraphs: [
          "Gelen mesajları öncelik sırasına göre inceleriz. Güvenlik, telif, çocuklara uygunluk ve oyun çalışmama sorunları genellikle daha hızlı değerlendirilir.",
          "Bol Oyun küçük ve hızlı çalışan bir oyun portalı olarak tasarlandığı için desteği sade tutuyoruz; ancak net yazılmış her bildirimi dikkatle ele alırız.",
        ],
      },
    ],
  },
  hakkimizda: {
    title: "Hakkımızda",
    description: "Bol Oyun'un amacı, yayın yaklaşımı ve Türkçe mini oyun portalı olarak sunduğu deneyim.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Bol Oyun nedir?",
        paragraphs: [
          "Bol Oyun, tarayıcıdan hızlıca oyun bulup oynamak isteyen kullanıcılar için hazırlanmış Türkçe-first bir mini oyun portalıdır. Amacımız basit: oyunu bul, sayfayı aç, Oyunu Başlat düğmesine bas ve oyna.",
          "Siteyi ağır bir sosyal ağ veya karmaşık bir platform yapmak yerine; arama, kategori, oyun sayfası, açıklama, kontroller, yorumlar ve favoriler gibi oyun deneyimine doğrudan yardımcı olan özelliklere odaklanıyoruz.",
        ],
      },
      {
        heading: "Yayın yaklaşımımız",
        paragraphs: [
          "Oyunları kategori, etiket, oynanabilirlik ve Türkçe içerik kalitesine göre düzenleriz. İçe aktarılan oyunlar otomatik olarak yayına alınmaz; önce teknik olarak kontrol edilir, içerik düzenlenir ve uygun olduğunda yayınlanır.",
          "Flash döneminden kalan oyunlar için Ruffle desteği, modern HTML5 oyunlar için gömülü oynatma ve gerekli durumlarda harici oynama seçenekleri sunulur.",
        ],
      },
      {
        heading: "Neyi önemsiyoruz?",
        paragraphs: [
          "Hızlı yüklenen sayfalar, anlaşılır Türkçe metinler, belirgin oyun görselleri, sade navigasyon ve oyuna başlamadan önce gereksiz yükleme yapmayan bir oyuncu deneyimi önceliğimizdir.",
          "Bol Oyun çocukların da anlayabileceği yalın bir dil kullanır; spammy SEO metinlerinden, karmaşık üyelik sistemlerinden ve oyun oynamayı gölgeleyen gereksiz özelliklerden uzak durur.",
        ],
      },
    ],
  },
  reklam: {
    title: "Reklam",
    description: "Bol Oyun'da reklam yayınlamak, sponsorluk ve marka iş birlikleri için temel bilgiler.",
    updatedAt: "9 Temmuz 2026",
    sections: [
      {
        heading: "Reklam olanakları",
        paragraphs: [
          "Bol Oyun, tarayıcı oyunlarıyla ilgilenen Türkçe kitleye ulaşmak isteyen markalar, oyun stüdyoları ve yayıncılar için reklam alanları sunabilir.",
          "Reklam yerleşimleri; ana sayfa üst banner, kategori sayfaları, oyun sayfası çevresi, yorum alanı öncesi, sidebar ve mobil alt alan gibi oyun deneyimini bozmadan planlanan slotlarda yönetilir.",
        ],
      },
      {
        heading: "Yayın ilkeleri",
        paragraphs: [
          "Reklamlar kullanıcıyı yanıltmamalı, zararlı yazılım içermemeli, çocuklara uygun olmayan içerikleri uygunsuz şekilde hedeflememeli ve oyun oynama alanını engellememelidir.",
          "Oyun aktifken kullanıcı deneyimini bozabilecek reklamları sınırlandırırız. Mobil yapışkan reklamlar, oyuncu oyundayken gizlenebilir veya daha az dikkat dağıtan şekilde çalıştırılabilir.",
        ],
      },
      {
        heading: "İş birliği başvurusu",
        paragraphs: [
          "Reklam, sponsorluk, öne çıkarılmış oyun veya marka iş birliği talepleri için reklam@boloyun.com adresine yazabilirsiniz.",
          "Başvurunuzda marka adınızı, kampanya hedefinizi, hedeflediğiniz tarih aralığını, reklam formatını, varsa kreatif örneklerinizi ve iletişim bilgilerinizi paylaşmanız yeterlidir.",
        ],
      },
      {
        heading: "Reddedilebilecek içerikler",
        paragraphs: [
          "Yasa dışı ürün ve hizmetler, yanıltıcı indirme düğmeleri, kumar veya yaş sınırlı içerikler, nefret söylemi, zararlı yazılım, agresif açılır pencere davranışları ve kullanıcı güvenini zedeleyen reklamlar kabul edilmez.",
        ],
      },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = legacySlugs[slug] ?? slug;
  const databasePage = await getPublishedStaticPage(canonicalSlug);
  const page = databasePage ? resolveDatabasePage(databasePage) : shouldUseStaticFallback() ? pages[canonicalSlug] : undefined;

  if (!page) {
    return {};
  }

  return buildMetadata({
    title: databasePage?.seo_title || page.title,
    description: databasePage?.seo_description || page.description,
    canonicalPath: `/sayfa/${canonicalSlug}`,
    image: databasePage?.og_image_url,
    indexable: databasePage?.is_indexable ?? true,
  });
}

export default async function StaticPage({ params }: Props) {
  const { slug } = await params;
  const redirectedSlug = legacySlugs[slug];

  if (redirectedSlug) {
    redirect(`/sayfa/${redirectedSlug}`);
  }

  const databasePage = await getPublishedStaticPage(slug);
  const page = databasePage ? resolveDatabasePage(databasePage) : shouldUseStaticFallback() ? pages[slug] : undefined;

  if (!page) {
    notFound();
  }

  return (
    <article className="rounded-md border border-border bg-card p-5 md:p-7">
      <JsonLd data={breadcrumbJsonLd([{ name: "Ana Sayfa", path: "/" }, { name: page.title, path: `/sayfa/${slug}` }])} />
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Bol Oyun</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">{page.title}</h1>
        <p className="mt-3 text-sm leading-6 text-foreground">{page.description}</p>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">Son güncelleme: {page.updatedAt}</p>
      </div>

      <div className="mt-7 max-w-3xl space-y-7">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-foreground">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} dangerouslySetInnerHTML={{ __html: staticPageInlineMarkupToHtml(paragraph) }} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function shouldUseStaticFallback() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function resolveDatabasePage(page: NonNullable<Awaited<ReturnType<typeof getPublishedStaticPage>>>): StaticPageContent {
  const document = readStaticPageDocument(page);
  return {
    title: page.title,
    description: page.seo_description || "Bol Oyun bilgilendirme sayfası.",
    updatedAt: document.updatedAt,
    sections: document.sections,
  };
}
