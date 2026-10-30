# Dilek Makina Cloudflare geçişi

30 Ekim 2026. Durum: yerel Worker/D1 çalışıyor; canlı sistem değiştirilmedi.

## Hedef

- ESER WEB: mevcut HTML/CSS/JS tasarımı, Cloudflare Pages'e kullanıcının kendi deploy akışıyla gönderilecek.
- ESER SUNUCU: Rust/Wasm Cloudflare Worker; D1 katalog ve R2 medya.
- Supabase uygulama bağımlılığı tamamen çıkarılıyor. Yönetici e-posta/şifresi Worker Secrets'ta, oturum imza anahtarı ayrı secret'ta tutulacak.
- Mevcut tasarım, navbar, WhatsApp, slider ve ürün yönetimi akışı korunacak.

## Yerel API

- Web: `http://127.0.0.1:4173`
- Worker: `http://127.0.0.1:8787`
- Worker'ın yerel `.dev.vars` dosyası `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` değerlerini alır; dosya Git'te tutulmaz.
- `src/api.js` tek HTTP istemcisidir. Token yalnız yönetim oturumunda `Authorization` başlığıyla gider.
- Anonim uçlar yalnız yayındaki ürün, aktif slider ve ilişkili görselleri döndürür. Admin uçları imzalı oturum ister.

## Bu turda yapılanlar

- Worker'da secret tabanlı giriş/oturum, D1 kategori/ürün okuma ve detay, aktif slider okuma, medya yükleme/silme/servis etme, ürün kaydetme/silme, kategori CRUD ve sayaç uçları eklendi.
- Web public katalog, ürün detayı ve vitrin slider'ı Worker JSON API'sine bağlandı.
- Admin giriş ekranı ve kategori/ürün/slider istemcileri Supabase Auth, PostgREST, RPC ve Storage çağrılarından ayrıldı.
- Rust/Wasm build, tarayıcı JavaScript sözdizimi kontrolleri ve statik `dist/` build geçti. Yerel D1 migration uygulandı; Wrangler Worker `127.0.0.1:8787` üzerinde çalışıyor.

## Kalan işler

- Admin girişini doğrulamak için kullanıcı `.dev.vars` içine kendi gizli e-posta/şifresini yazmalı; parola sohbete alınmamalı.
- Ürün, kategori ve slider yazma uçlarını kullanıcı secret'larıyla yerel D1/R2 üzerinde gözden geçir; çatışma ve hata durumlarını düzelt.
- Üretime geçişte Pages origin'ini Worker CORS listesine ekle ve gerçek Cloudflare binding'lerini ayrıca kur.
- İki repo da local kalacak. Push, Pages/Workers deploy, canlı D1/R2 oluşturma veya uzaktaki veriye yazma bu kapsamda yok.
