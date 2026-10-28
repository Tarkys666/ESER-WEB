-- Existing sample catalog. Does not overwrite previously edited records.
begin;
insert into public.categories(id, name, sort_order) values
('su-kacak-tespit', 'Su Kaçak Tespit Cihazları', 0),
('termal-kameralar', 'Termal Kameralar', 1),
('kanal-acma', 'Kanal Açma Makinaları', 2),
('su-jetleri', 'Su Jetleri', 3),
('boru-gozlem', 'Boru Gözlem Kameraları', 4),
('dedektorler', 'Dedektörler', 5),
('yikama', 'Yıkama Makinaları', 6),
('oto-yikama', 'Oto Yıkama Ekipmanları', 7),
('pprc', 'PPRC Boru Kaynak Makinaları', 8),
('test-pompalari', 'Test Pompaları', 9),
('boru-makaslari', 'Boru Makasları', 10),
('pompalar', 'Pompalar', 11),
('vidanjor', 'Vidanjör', 12),
('aksesuarlar', 'Aksesuar ve Yedek Parçalar', 13),
('aracustu', 'Araçüstü Ekipmanları', 14),
('oto-yikama-makinalari', 'Oto Yıkama Makinaları', 15)
on conflict (id) do nothing;
insert into public.products(slug, title, category_id, source_url, sort_order, status) values
('guide-mobirair-akilli-telefon-termal-kamerasi', 'GUIDE MobirAir Akıllı Telefon Termal Kamerası', 'termal-kameralar', 'https://www.xn--erdoanmakina-gyb.com.tr/termal-kameralar/', 0, 'published'),
('guide-d384a-akilli-termal-kamera', 'GUIDE D384A Akıllı Termal Kamera', 'termal-kameralar', 'https://www.xn--erdoanmakina-gyb.com.tr/termal-kameralar/', 1, 'published'),
('rothenberger-roscan-3000-termal-kamera', 'ROTHENBERGER ROSCAN 3000 Termal Kamera', 'termal-kameralar', 'https://www.xn--erdoanmakina-gyb.com.tr/termal-kameralar/', 2, 'published'),
('guide-pc210-termal-kamera', 'GUIDE PC210 Termal Kamera', 'termal-kameralar', 'https://www.xn--erdoanmakina-gyb.com.tr/termal-kameralar/', 3, 'published'),
('erdogan-makina-kanal-acma-16-22-set', 'Erdoğan Makina Kanal Açma 16+22 Set', 'kanal-acma', 'https://www.xn--erdoanmakina-gyb.com.tr/kanal-acma-makinalari/', 4, 'published'),
('ninjaflex-pro-gider-acma-makinesi', 'Ninjaflex Pro Gider Açma Makinesi', 'kanal-acma', 'https://www.xn--erdoanmakina-gyb.com.tr/kanal-acma-makinalari/', 5, 'published'),
('rothenberger-r600', 'Rothenberger R600', 'kanal-acma', 'https://www.xn--erdoanmakina-gyb.com.tr/kanal-acma-makinalari/', 6, 'published'),
('hedef-cobra-set-16-22', 'Hedef Cobra Set 16+22', 'kanal-acma', 'https://www.xn--erdoanmakina-gyb.com.tr/kanal-acma-makinalari/', 7, 'published'),
('gn-500-kanal-goruntuleme', 'GN-500 Kanal Görüntüleme', 'boru-gozlem', 'https://www.xn--erdoanmakina-gyb.com.tr/urun/gn-500-kanal-goruntuleme/', 8, 'published'),
('rc-200-kanal-goruntuleme', 'RC-200 Kanal Görüntüleme', 'boru-gozlem', 'https://www.xn--erdoanmakina-gyb.com.tr/urun/rc-200-kanal-goruntuleme/', 9, 'published'),
('kanal-goruntuleme-makinasi', 'Kanal Görüntüleme Makinası', 'boru-gozlem', 'https://www.xn--erdoanmakina-gyb.com.tr/urun/kanal-goruntuleme-makinasi/', 10, 'published'),
('virax-micro-visioval-5i-1-arada-kamera', 'Virax Micro Visioval 5i 1 Arada Kamera', 'boru-gozlem', 'https://www.xn--erdoanmakina-gyb.com.tr/urun/virax-micro-visioval-5i-1-arada-kamera/', 11, 'published'),
('sgs-5400-1800w-150-bar-yuksek-basincli-yikama-makinasi', 'SGS 5400 1800W 150 Bar Yüksek Basınçlı Yıkama Makinası', 'yikama', 'https://www.xn--erdoanmakina-gyb.com.tr/yikama-makinalari/', 12, 'published'),
('sgs-5401-2500w-170-bar-yuksek-basincli-yikama-makinasi', 'SGS 5401 2500W 170 Bar Yüksek Basınçlı Yıkama Makinası', 'yikama', 'https://www.xn--erdoanmakina-gyb.com.tr/yikama-makinalari/', 13, 'published'),
('250-bar-soguk-yikama-makinasi', '250 Bar Soğuk Yıkama Makinası', 'yikama', 'https://www.xn--erdoanmakina-gyb.com.tr/yikama-makinalari/', 14, 'published'),
('cm-01-set-v-gold-vakumlu-boru-kaynak-seti', 'CM-01-Set-V/Gold (Vakumlu) Boru Kaynak Seti', 'pprc', 'https://www.xn--erdoanmakina-gyb.com.tr/urun-kategori/pprc-boru-kaynak-makinalari1/', 15, 'published'),
('fusion-fsbk15-s1-1500-w-pprc-boru-kaynak-seti', 'Fusion FSBK15-S1 1500 W PPRC Boru Kaynak Seti', 'pprc', 'https://www.xn--erdoanmakina-gyb.com.tr/urun-kategori/pprc-boru-kaynak-makinalari1/', 16, 'published'),
('rothenberger-roweld-p75-eco', 'Rothenberger ROWELD P75 ECO', 'pprc', 'https://www.xn--erdoanmakina-gyb.com.tr/urun-kategori/pprc-boru-kaynak-makinalari1/', 17, 'published')
on conflict (slug) do nothing;
commit;
