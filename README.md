# Ayraç

Sekmeleri açık tutmak yerine bağlantılarını klasörlerde sakla. Chrome yan panelinden bul, not ekle ve gerektiğinde yeniden aç.


[Ayraç tanıtımı](docs/1.png) (docs/2.png)(docs/3.png)(docs/4.png)(docs/5.png)


- Renkli klasörler, notlar, favoriler ve arama.
- Kaydet veya kaydedip sekmeyi kapat.
- Bağlantıları toplu aç, taşı ve sil; son silme işlemini geri al.
- Hesap gerekmez; kayıtlar Chrome profilinde yerel saklanır.

**React · TypeScript · Vite · Manifest V3**

## Kurulum

Node.js 22.12+ ile:

```bash
npm ci
npm run build
```

Chrome’da `chrome://extensions` → **Geliştirici modu** → **Paketlenmemiş öğe yükle** → oluşan `dist` klasörünü seç.

Testler: `npm test`[Doğrulama notları](docs/VALIDATION.md) · [MIT](LICENSE)

# Ayraç — kurulum

## GitHub kaynak kodundan

1. Projeyi indirip ZIP’ten çıkar veya Git ile klonla.
2. Node.js 22.12 veya daha yeni bir sürüm kurulu olmalı.
3. Proje klasöründe terminali açıp çalıştır:

```bash
npm ci
npm run build
```

4. Chrome adres çubuğuna `chrome://extensions` yaz.
5. **Geliştirici modu**nu aç ve **Paketlenmemiş öğe yükle** düğmesine tıkla.
6. Derleme sonucunda oluşan **dist** klasörünü seç.
7. Ayraç simgesini sabitle ve simgeye tıklayarak yan paneli aç.

`dist` ve `node_modules` GitHub kaynak koduna dahil değildir; yukarıdaki komutlarla oluşturulur. Uzantıyı yükledikten sonra `dist` klasörünü taşıma veya silme.

## Güncelleme

Mevcut uzantıyı kaldırmadan, aynı proje klasöründe yeni kaynak kodla tekrar `npm ci` ve `npm run build` çalıştır. Chrome uzantı kartındaki **yenile** simgesine bas. Aynı kurulum konumunu ve uzantı kimliğini koru; başka konumdan yeni uzantı yüklemek eski kayıtlara erişim garantisi vermez.

## Kullanım

- **Yeni klasör:** ad yaz, istersen renk seç.
- **Klasör satırı:** kayıtları aynı ekranda gösterir; sekme açmaz.
- **Üç nokta:** adı/rengi düzenle, toplu aç veya klasörü sil.
- **Kaydet:** bağlantı saklanır, sekme açık kalır.
- **Kaydet ve kapat:** kayıt doğrulandıktan sonra sekme kapanır.
- **Seç:** bağlantıları toplu aç, taşı veya kaldır.
- **Not ekle:** kaldığın yeri yaz.
- **Geri al:** aynı panel oturumunda son silmeyi geri alır. Sonraki kayıt değişikliklerini ezmez.

Veriler Chrome profilinde yereldir. Uzantının kaldırılması kayıtları da siler. Form girdileri ve video konumu otomatik kaydedilmez.
