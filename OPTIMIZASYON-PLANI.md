# Dilek Makina optimizasyon planı

30 Ekim 2026 — uygulama planı ve yerel uygulama durumu.

## Uygulama durumu

- Tamamlandı: toplu kapak sorgusu, `/api/home`, admin temsilci ürün seçimi ve D1 migration, 24 ürünlük sunucu sayfalaması, arama debounce/istek iptali, başarılı anonim GET cache'i, kısa ömürlü herkese açık görsel cache'i, admin/taslak yanıtlarında `no-store`, upload sırasında WebP küçültme, lazy görseller, yerel WOFF2 fontları ve HTML için yeniden doğrulama ile hash'li CSS/JS build'i.
- Ölçüm bekliyor: gerçek D1/R2 verisi olan yerel veya production benzeri API'de MISS/HIT TTFB, yanıt boyutu, LCP ve D1 okuma sayısı. Kod tek başına production performansını kanıtlamaz.
- `0003` ve `0004` uzak D1'e sırayla uygulandı ve `d1_migrations` geçmişine kaydedildi. Yerel D1 migration'ı uygulanmadı. Sunucu commit'i `5aa4069` `main`e gönderildi; Worker build doğrulaması bekliyor. Web değişikliklerinin `main` push'u sürüyor.
- Önceden var olan WhatsApp JPEG kaynakları korundu. Admin'den yapılacak yeni yüklemeler WebP'e çevrilir; eski dosyalar dönüştürülüp karşılaştırılmadan silinmedi.

## 1. Ana sayfayı küçük bir veri akışına ayır

ESER SUNUCU:

- `GET /api/home`: yalnız aktif slaytlar ve kategori kartları için gereken alanlar. Kart başına kategori kimliği/adı, temsilci ürün adı/slug'ı ve tek kapak görseli.
- Ana sayfa için tüm ürünleri ve bütün ürün görsellerini getirme.
- Admin kategori formunda temsilci ürün seçimi sun. D1 migration ile kategoriye isteğe bağlı temsilci ürün ilişkisi ekle. Seçim aynı kategoriye ait, yayındaki bir ürün olmalı.
- Seçim boşsa görselli ilk yayındaki ürün; o da yoksa kategori adı gösterilsin. Ürün silindiğinde seçim temizlensin; taslağa alındığında veya kategorisi değiştiğinde geçersiz seçim kullanılmasın.

ESER WEB:

- Ana sayfa, ortak istemciden yalnız `/api/home` istesin. Navbar için kategori bilgisi de aynı yanıttan gelsin.
- Slider ve kategori kartları bu ortak yanıtı kullansın. Ürün kataloğu ayrı yüklensin.
- İlk vitrin görseli öncelikli, sonraki görsel geçişten önce arka planda yüklensin. Bütün slaytları başlangıçta indirme.

## 2. Basit ve sınırları belli önbellek

| İçerik | İlk sürüm davranışı |
| --- | --- |
| `/api/home` | Cloudflare Cache API'de 60 saniye |
| Genel kategori listesi | Edge'de 60 saniye |
| Ürün listesi ve detay | Sorgular düzeltildikten sonra edge'de 60 saniye |
| Genel API yanıtlarının tarayıcı kopyası | Doğrulamadan tekrar kullanılmasın; edge süresine ek bir eskime süresi oluşmasın |
| Yayındaki görseller | İçeriğe özgü dosya anahtarı; başlangıçta tarayıcı/edge için 5 dakika |
| Admin, giriş, taslak görseli ve hata yanıtları | `no-store`; ortak önbelleğe yazılmaz |

- Önbellek yalnız başarılı, anonim, herkese açık GET yanıtları için kullanılır. Genel istemci admin oturum token'ını public isteklere eklemesin; admin görsel önizlemesi ayrı kalsın.
- Önbellek anahtarları API sürümünü ve izin verilen sorgu parametrelerini içersin. Origin'e bağlı CORS başlıkları önbellekten okunduktan sonra eklensin.
- Cache HIT yolunda D1/R2 okunmasın. MISS yolunda veri okunup yanıt önbelleğe yazılsın.
- Admin kaydetme/silme sonrasında ilgili yerel cache girdileri temizlensin. Diğer Cloudflare veri merkezlerinde eski veri TTL bitene kadar kalabilir: ilk sürümün görünürlük sınırı yaklaşık 60 saniyedir. Admin ekranı kaydı doğrudan güncel kaynaktan okur.
- Anında dünya çapında güncelleme sonradan gerekirse dar yetkili Cloudflare purge entegrasyonu eklenir. İlk sürüm için KV, cron veya ayrı cache servisi gerekmez.
- Görsel değişikliğinde yeni dosya anahtarı kullanılır. Yayından kaldırılan genel görsellerin tarayıcıdaki mevcut kopyası 5 dakikalık süre bitene kadar kalabilir; özel/taslak görseller her zaman `no-store` olur.

## 3. Ürün API'sindeki sorgu sayısını azalt

- Mevcut ürün başına ayrı medya sorgusunu kaldır. Liste kartlarına yalnız tek kapak görseli döndüren toplu SQL kullan; detay sayfası tüm görselleri ayrı istekte alır.
- Kategori, yayın durumu, sıralama ve medya ilişkisi indekslerini mevcut migration'larla karşılaştır; yalnız eksik indeksleri ekle.
- Ürün listesinde 24 kayıtlık sunucu sayfalaması, kategori ve arama parametreleri kullan. Frontend bütün kataloğu indirip filtrelemesin.
- Filtre değişiminde önceki isteği iptal et; arama yazarken yaklaşık 250 ms bekle. Cache anahtarına sayfa, kategori ve arama değerlerini kat; sınırsız arama kombinasyonlarını önbelleğe alma.

## 4. Görsel ve statik dosya aktarımını küçült

- Upload sırasında görsel boyutunu ve türünü doğrula; tarayıcıda yeniden boyutlandırıp desteklenen WebP çıktısı üret. Sunucu yükleme sınırlarını ayrıca uygular.
- Kartlar için yaklaşık 640 px, vitrin için yaklaşık 1600 px üst sınırla başla; görsel kaliteye bakarak ayarla. Mevcut dosyaları bir defalık dönüştür; orijinalleri dönüşüm doğrulanmadan silme.
- Ekran dışındaki ürün görselleri lazy-load; boyutları sabit belirtilsin. İlk görünür görsel lazy-load edilmesin.
- CSS/JS dosyalarında build içerik hash'i kullan; HTML yeniden doğrulansın, hash'li dosyalar uzun süre cache'lensin. Elle sürüm parametresi değiştirme gereği kalksın.
- Font ailelerini ve ağırlıklarını azalt; gerekli WOFF2 dosyalarını yerelden sun ve metnin font beklemesini önle.

## Uygulama sırası ve kabul ölçütleri

1. Önce ürün sorgusunu toplulaştır, `/api/home` ve 60 saniyelik cache ekle. Boş katalog ve mevcut API tüketicileri çalışmaya devam etmeli.
2. Kategori temsilcisi seçimini migration ve admin formuyla ekle; ana sayfayı yeni yanıta bağla.
3. Sonraki aşamada sayfalama ve görsel dönüşümünü uygula.
4. Aynı ağda önce/sonra API TTFB, yanıt boyutu, D1 sorgu sayısı, ilk vitrin görünme süresi ve mobil LCP ölçülsün. MISS ve HIT ayrı raporlansın; evrensel gecikme garantisi verilmesin.
5. Ana sayfa tek katalog/vitrin veri isteği yapmalı; HIT sırasında D1 okunmamalı; ürün liste sorgu sayısı ürün sayısıyla artmamalı.
6. Admin değişikliği public JSON'da yaklaşık 60 saniyede görünmeli. Ürün silme/taslak yapma, kategori silme, temsilci değiştirme, slayt sıralama ve yetkisiz taslak görsel erişimi ayrıca kontrol edilmeli.

Kod sorumluluğu: Rust API, SQL, migration ve cache ESER SUNUCU'da; render, admin alanı, görsel hazırlama ve Pages build ESER WEB'de. Her iki repo için ayrı commit; canlıya gönderme ayrıca yapılır.

## Kaynaklar

- Cloudflare Cache API: https://developers.cloudflare.com/workers/runtime-apis/cache/ — cache ve silme işleminin veri merkezi kapsamı.
- Cloudflare global purge: https://developers.cloudflare.com/api/resources/cache/methods/purge/ — ileride tüm veri merkezlerinde geçersiz kılma gerekirse.
