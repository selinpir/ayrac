# Ayraç 0.3.0 — doğrulama

Tarih: 4 Ekim 2026 (Türkiye)

- `npm run build`: TypeScript kontrolü ve üretim derlemesi başarılı.
- `npm test`: 24/24 test geçti.
- `CHROMIUM_PATH=/tmp/chromium npm run test:ui`: başarılı. Bu ortamda görüntüleme amaçlı Chromium ve testlere özel Chrome API adaptörü kullanıldı; adaptör `dist/` içine alınmaz.

Kontrol edilenler: eski 13 klasörün korunması; klasör açmanın sekme açmaması; beş renkli palet; oluşturma ve renk değiştirme; kaydetmede açık sekmenin korunması; notla birlikte kaydedip kapatma; varsayılan güvenli klasör silme; klasör, not, kural ve atamaları geri alma; başka panelden sonraki düzenlemeyi geri almayla ezmeme; kayıt hatasında sekmeyi kapatmama; seçilenleri açarken aynı URL'yi çoğaltmama; yeniden yükleme sonrası kalıcılık; not araması; 280 ve 320 pikselde yatay taşma olmaması; tarayıcıda JavaScript istisnası olmaması.

Ekran görüntüleri test verileriyle gerçek derlenmiş arayüzden alındı.

Sınırlar: native Chrome yan paneli ve araç çubuğu elle denenmedi. `tests/extension.e2e.mjs` tam Chromium bulunan ortamlar için güncellendi, bu ortamda çalıştırılmadı. Gerçek profil güncellemesi ve RAM/CPU ölçümü yapılmadı. CI bu testleri tam Chromium indirdikten sonra çalıştıracak şekilde ayarlı.
