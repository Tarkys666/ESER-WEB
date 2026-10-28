# Dilek Makina Web — UI/UX ve teknik tasarım notları

## Amaç

`https://www.xn--erdoanmakina-gyb.com.tr/` ana sayfasının içerik akışını ve ürün keşif deneyimini Dilek Makina için yeniden tasarlamak. Bölüm sırası ve ürün kategorilerinden ilham alınır; logo, fotoğraf ve görsel tasarım Dilek Makina'ya ait olmalı.

## Referans inceleme durumu

Bu çalışma ortamından referans URL'ye erişim 403 ağ geçidi yanıtı verdi. Bu nedenle aşağıdaki gerçek sayfa haritası, renkler, tipografi, bileşenler ve mobil davranış henüz doğrulanmadı. Uygulamaya geçmeden önce referansı tarayıcıda açıp bu bölümü gözlemle güncelleyin. URL'den yalnızca sayfanın `vidanjor` (vidanjör) ürününe ait olduğu anlaşılabiliyor.

| Alan | Durum |
| --- | --- |
| Bölüm sırası ve içerik | İncelenemedi |
| Renk paleti, yazı tipi ve boşluklar | İncelenemedi |
| Navigasyon ve mobil menü | İncelenemedi |
| Ürün görselleri / galeri | İncelenemedi |
| Teklif/iletişim akışı | İncelenemedi |
| SEO ve erişilebilirlik | İncelenemedi |

## Önerilen geçici sayfa haritası

Bu, referansın birebir dökümü değil; endüstriyel ürün tanıtım sayfası için doğrulanacak bir başlangıç taslağıdır.

1. **Üst şerit ve ana navigasyon:** Dilek Makina logosu, ana sayfa/ürünler/kurumsal/iletişim bağlantıları ve belirgin telefon/teklif eylemi. Mobilde klavye ve ekran okuyucu ile kullanılabilen açılır menü.
2. **Ürün giriş alanı:** Vidanjör başlığı, tek cümlelik değer önerisi, ürüne ait büyük özgün fotoğraf ve teklif/telefon CTA'sı.
3. **Ürün özeti:** Kullanım alanı, araç/üst yapı tipi ve kısa faydalar.
4. **Özellikler ve teknik bilgiler:** Kolay taranabilen özellik kartları ve birim belirtilmiş teknik tablo. Bilinmeyen teknik değerler yayınlanmamalı.
5. **Fotoğraf galerisi:** Büyük görsel, küçük resim seçimi, mobil kaydırma; alt metinler.
6. **Uygulama / çalışma bilgisi:** Ürün kullanımını açıklayan görsel ve metin; yalnızca Dilek Makina'nın doğruladığı bilgiler.
7. **Teklif ve iletişim:** Telefon bağlantısı ve kısa form. Formda başarı/hata durumu ve gizlilik açıklaması.
8. **Alt bilgi:** Adres, iletişim, çalışma bilgileri, harita/kurumsal bağlantılar.

## Görsel ve etkileşim ilkeleri

- Referansın bölüm hiyerarşisi ve kullanım kolaylığından ilham alın; logo, fotoğraf, metin ve özgün marka varlıklarını kopyalamayın.
- Önce mobil düzeni tasarlayın; sabit CTA içerik ve klavye odağını kapatmamalı.
- Tek birincil eylem seçin (teklif al veya ara); telefon numaraları mobilde `tel:` bağlantısı olmalı.
- Fotoğrafları boyutlandırıp modern formatta sunun, anlamlı alt metin ekleyin ve ilk ekran dışındakileri gecikmeli yükleyin.
- Renk kontrastı, görünür odak, başlık sırası, form etiketleri ve klavye erişimini koruyun.
- Teknik değerleri, sertifikaları ve başarı iddialarını Dilek Makina'dan teyit etmeden doldurmayın.

## Uygulama mimarisi önerisi

- **Frontend/hosting:** `ESER-WEB` uygulaması Netlify'da; framework depo içeriği görüldükten sonra seçilecek. Ürün sayfası hızlı, indekslenebilir ve mümkünse sunucu tarafında/önceden render edilmiş olmalı.
- **Veri ve auth:** Supabase Auth, Postgres ve Row Level Security (RLS). Tarayıcıda yalnızca proje URL'si ve anon/publishable anahtarı bulunabilir; service-role anahtarı asla istemciye veya git'e konmamalı.
- **İçerik:** İlk sürüm için ürün metinleri ve teknik özellikleri Supabase tablolarında tutulabilir. Görseller Supabase Storage'da herkese açık ürün bucket'ında veya optimize edilmiş statik varlıklarda tutulabilir. İstemciye yalnızca yayınlanmış içerik açılmalı.
- **Teklif formu:** Form gönderimini Netlify Function üzerinden doğrula ve Supabase'e yaz. Sunucu tarafında alan doğrulama, spam/rate limit önlemleri ve sırların Netlify environment variables içinde tutulması gerekir. E-posta bildirimi entegrasyonu seçilirse sağlayıcı ve gizli anahtar ayrıca belirlenmeli.

## Admin paneli ve e-posta girişi

1. Onaylanan yönetici hesabını Supabase Auth üzerinden oluştur. Kullanıcı şifresini doğrudan Supabase'te girer; şifre kaynak koduna yazılmaz.
2. `admin.html` üzerinden e-posta ve şifreyle giriş yap; oturumu Supabase `getUser()` ile doğrula. Giriş yapmış olmak tek başına admin yetkisi vermez.
3. İzinli yöneticileri Supabase'te açıkça belirle (başlangıç için `admin_users` tablosu ve auth user UUID). Yeni admin ekleme/çıkarma yalnızca güvenilir yönetim işlemiyle yapılsın; public signup admin rolü vermesin.
4. Admin API/işlemleri ve RLS politikaları yetkiyi sunucu tarafında kontrol etsin. `user_metadata` gibi kullanıcı tarafından değiştirilebilir alanları yetki kaynağı kabul etme. Yetkisiz istek `403`, oturumsuz istek giriş akışına yönlenmeli.
5. Admin ekranlarında içerik listeleme, düzenleme, taslak/yayın durumu ve görsel yükleme sun. Değişikliklerde form doğrulaması, kaydetme sonucu ve hata mesajları açık olsun.
6. Oturum yenileme, çıkış, redirect/CSRF kontrolleri ve yetkisiz kullanıcının doğrudan API çağrıları test edilsin. Service-role anahtarı yalnızca Netlify Function ortamında gerekli olduğunda kullanılsın; mümkünse kullanıcı JWT'si + RLS ile işlem yapılsın.

### Başlangıç veri modeli

- `products`: `id`, `slug`, `title`, `summary`, `content`, `status` (`draft`/`published`), `updated_at`.
- `product_specs`: `id`, `product_id`, `label`, `value`, `unit`, `sort_order`.
- `product_media`: `id`, `product_id`, `storage_path`, `alt_text`, `sort_order`.
- `admin_users`: `user_id` (Supabase Auth UUID), `created_at`.
- İsteğe bağlı `leads`: iletişim formu gönderileri; kişisel veriler için saklama süresi ve erişim kuralları belirlenmeli.

## Uygulama durumu

- Ana sayfa üç ana bölümden oluşur: kısa giriş, ürün grupları, firma ve iletişim bilgileri. Ürün kataloğu ayrı sayfada kategori filtreleri ve aramayla sunulur.
- 21st.dev'deki sade geometrik hero, responsive navbar ve editorial düzen örneklerinden esinlenildi. Başlıklarda Manrope, gövde metninde DM Sans, küçük etiketlerde DM Mono kullanılır. Özgün GLSL/WebGL hero arka planı ve ince kırmızı grid vurgusu vardır; React ve Three.js eklenmedi.
- Yerel katalog `dilek_makina` Supabase projesinden yayınlanmış ürünleri okur. Veritabanı şeması, aktarım ve doğrulama dosyaları `supabase/` altındadır. `admin.html` e-posta/şifre girişi, filtreli ürün listesi, ürün ekleme/düzenleme, taslak/yayın durumu, teknik özellikler ve çoklu görsel yönetimi sunar. Ürün bilgileri tek veritabanı işleminde kaydedilir; eski sürümün üzerine yazılması engellenir. `urun.html` yayınlanmış ürünlerin fotoğraf galerisi ve detaylarını gösterir. Dilek Makina logosu ve iletişim bilgileri sağlandı; adres henüz belirtilmedi.
- Proje statik olarak Netlify'da yayınlanabilir.

## Geliştirmeye başlamadan gerekenler

Ürün kataloğu Supabase'ten beslenir. Yönetici hesabı Auth UUID'siyle yetkilendirilir. Teknik özellikler, adres ve teklif formunun alıcısı doğrulanmalı. Gizli anahtarları sohbete veya depoya eklemeyin; Netlify ve Supabase'in güvenli ayarlarında tanımlayın.

## Doğrulama listesi

- Referans sayfayı masaüstü ve mobilde gözleyip gerçek bölüm haritasını kaydet.
- Ürün sayfasında mobil görünüm, klavye erişimi, kontrast ve görsel yükleme performansını kontrol et.
- Supabase RLS ile anonim ziyaretçinin yalnızca yayınlanmış ürünleri okuyabildiğini doğrula.
- Yönetici e-posta/şifre girişini, izinli admin kontrolünü ve admin olmayan/oturumsuz kullanıcıların reddini doğrula.
- Teklif formunun doğrulama, spam sınırlama ve başarı/hata akışlarını doğrula.
