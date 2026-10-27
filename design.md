# ESER Web — UI/UX ve teknik tasarım notları

## Amaç

`https://www.xn--erdoanmakina-gyb.com.tr/vidanjor/` sayfasının endüstriyel ürün tanıtım yaklaşımını örnek alarak Eser için benzer bir ürün deneyimi hazırlamak. Marka metinleri, fotoğraflar ve görsel kimlik Eser'e ait olmalı; kaynak siteden içerik veya görsel kopyalanmamalı.

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

1. **Üst şerit ve ana navigasyon:** Eser logosu, ana sayfa/ürünler/kurumsal/iletişim bağlantıları ve belirgin telefon/teklif eylemi. Mobilde klavye ve ekran okuyucu ile kullanılabilen açılır menü.
2. **Ürün giriş alanı:** Vidanjör başlığı, tek cümlelik değer önerisi, ürüne ait büyük özgün fotoğraf ve teklif/telefon CTA'sı.
3. **Ürün özeti:** Kullanım alanı, araç/üst yapı tipi ve kısa faydalar.
4. **Özellikler ve teknik bilgiler:** Kolay taranabilen özellik kartları ve birim belirtilmiş teknik tablo. Bilinmeyen teknik değerler yayınlanmamalı.
5. **Fotoğraf galerisi:** Büyük görsel, küçük resim seçimi, mobil kaydırma; alt metinler.
6. **Uygulama / çalışma bilgisi:** Ürün kullanımını açıklayan görsel ve metin; yalnızca Eser'in doğruladığı bilgiler.
7. **Teklif ve iletişim:** Telefon bağlantısı ve kısa form. Formda başarı/hata durumu ve gizlilik açıklaması.
8. **Alt bilgi:** Adres, iletişim, çalışma bilgileri, harita/kurumsal bağlantılar.

## Görsel ve etkileşim ilkeleri

- Referansın bölüm hiyerarşisi ve kullanım kolaylığından ilham alın; logo, fotoğraf, metin ve özgün marka varlıklarını kopyalamayın.
- Önce mobil düzeni tasarlayın; sabit CTA içerik ve klavye odağını kapatmamalı.
- Tek birincil eylem seçin (teklif al veya ara); telefon numaraları mobilde `tel:` bağlantısı olmalı.
- Fotoğrafları boyutlandırıp modern formatta sunun, anlamlı alt metin ekleyin ve ilk ekran dışındakileri gecikmeli yükleyin.
- Renk kontrastı, görünür odak, başlık sırası, form etiketleri ve klavye erişimini koruyun.
- Teknik değerleri, sertifikaları, başarı iddialarını ve iletişim bilgilerini Eser'den teyit etmeden doldurmayın.

## Uygulama mimarisi önerisi

- **Frontend/hosting:** `ESER-WEB` uygulaması Netlify'da; framework depo içeriği görüldükten sonra seçilecek. Ürün sayfası hızlı, indekslenebilir ve mümkünse sunucu tarafında/önceden render edilmiş olmalı.
- **Veri ve auth:** Supabase Auth, Postgres ve Row Level Security (RLS). Tarayıcıda yalnızca proje URL'si ve anon/publishable anahtarı bulunabilir; service-role anahtarı asla istemciye veya git'e konmamalı.
- **İçerik:** İlk sürüm için ürün metinleri ve teknik özellikleri Supabase tablolarında tutulabilir. Görseller Supabase Storage'da herkese açık ürün bucket'ında veya optimize edilmiş statik varlıklarda tutulabilir. İstemciye yalnızca yayınlanmış içerik açılmalı.
- **Teklif formu:** Form gönderimini Netlify Function üzerinden doğrula ve Supabase'e yaz. Sunucu tarafında alan doğrulama, spam/rate limit önlemleri ve sırların Netlify environment variables içinde tutulması gerekir. E-posta bildirimi entegrasyonu seçilirse sağlayıcı ve gizli anahtar ayrıca belirlenmeli.

## Admin paneli ve Google girişi planı

1. Google OAuth istemci kimliğini Google Cloud'da oluştur; Supabase Auth > Google sağlayıcısına OAuth bilgilerini ekle. Supabase Site URL ve izinli redirect URL'lerini üretim Netlify domaini, varsa özel domain ve yerel geliştirme URL'leriyle sınırla.
2. `/admin` rotasını koru. Supabase Google OAuth akışıyla giriş yap; dönüşte oturumu doğrula. Giriş yapmış olmak tek başına admin yetkisi vermemeli.
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

## Geliştirmeye başlamadan gerekenler

Şu an `/workspace/ESER-WEB` ve `/workspace/ESER-SUNUCU` checkout'larında uygulama dosyası/commit yok. Framework, komutlar ve mevcut ürün içeriği bu nedenle doğrulanamıyor. Kodlamadan önce checkout'ların içeriği sağlanmalı; ayrıca şu bilgiler teyit edilmeli: Eser logosu ve marka renkleri, vidanjör görselleri, doğru teknik özellikler, telefon/adres, teklif formunun alıcısı ve ilk admin olacak Google hesaplarının e-posta adresleri. Gizli anahtarları sohbete veya depoya eklemeyin; Netlify ve Supabase'in güvenli ayarlarında tanımlayın.

## Doğrulama listesi

- Referans sayfayı masaüstü ve mobilde gözleyip gerçek bölüm haritasını kaydet.
- Ürün sayfasında mobil görünüm, klavye erişimi, kontrast ve görsel yükleme performansını kontrol et.
- Supabase RLS ile anonim ziyaretçinin yalnızca yayınlanmış ürünleri okuyabildiğini doğrula.
- Admin Google OAuth girişini, izinli admin kontrolünü ve admin olmayan/oturumsuz kullanıcıların reddini doğrula.
- Teklif formunun doğrulama, spam sınırlama ve başarı/hata akışlarını doğrula.
