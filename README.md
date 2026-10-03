# Ayraç

Sekmeleri açık tutmak yerine bağlantılarını klasörlerde sakla. Chrome yan panelinden bul, not ekle ve gerektiğinde yeniden aç.

<img width="704" height="827" alt="1" src="https://github.com/user-attachments/assets/ae41e8d8-c48d-4e3d-b6c3-4549f35cdb5d" />
<img width="704" height="827" alt="2" src="https://github.com/user-attachments/assets/906a5afb-3123-47eb-980a-4a7c851fe9f4" />
<img width="704" height="827" alt="3" src="https://github.com/user-attachments/assets/25fa7534-d2e1-4da6-a095-ede170a90eb2" />
<img width="704" height="827" alt="4" src="https://github.com/user-attachments/assets/acd8d886-9bbf-49ab-aaac-b3830936e91b" />
<img width="704" height="827" alt="5" src="https://github.com/user-attachments/assets/e641f89b-1765-4e54-bf24-96c662071c91" />



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
