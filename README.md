# haber-aggregator-backend

> 🇹🇷 Türkçe | 🇬🇧 [English](#english)

---

## 🇹🇷 Türkçe

### Nedir?

**haber-aggregator-backend**, birden fazla haber kaynağını otomatik olarak tarayan, içerikleri ayrıştıran ve REST API aracılığıyla sunan bir haber toplayıcı backend servisidir. Fastify, TypeScript ve MongoDB üzerine inşa edilmiştir.

### Özellikler

- 🕷️ Otomatik crawler — zamanlanmış görevlerle haberleri periyodik olarak çeker
- 📰 İçerik ayrıştırma — Readability ve akıllı içerik çıkarıcı ile makale temizleme
- 🗄️ MongoDB entegrasyonu — haber ve kaynak yönetimi
- 🔒 Crawler kilitleme — eş zamanlı crawler çakışmalarını önler
- 🌐 Admin paneli — `public/` dizininde hazır arayüz
- ⚙️ Yapılandırılabilir cron aralıkları

---

### Kurulum

#### Gereksinimler

- Node.js >= 24
- MongoDB (yerel veya uzak)
- TypeScript (devDependency olarak dahil)

#### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/burakaltinbicak/haber-aggregator-backend.git
cd haber-aggregator-backend

# 2. Bağımlılıkları yükle
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle (aşağıya bak)

# 4. Uygulamayı başlat
npm start
```

#### `.env` Yapılandırması

```env
PORT=3000
DATABASE_URL=mongodb://localhost:27017/haber-aggregator
CRAWLER_INTERVAL=*/10 * * * *
CLEANUP_INTERVAL=0 */12 * * *
```

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | Sunucunun dinleyeceği port | `3000` |
| `DATABASE_URL` | MongoDB bağlantı URI'si | `""` |
| `CRAWLER_INTERVAL` | Crawler çalışma sıklığı (cron) | `*/10 * * * *` (10 dakikada bir) |
| `CLEANUP_INTERVAL` | Eski/tekrarlanan haberleri veritabanından temizleme görevi sıklığı (cron) | `0 */12 * * *` (12 saatte bir) |
> ⚠️ `.env.example` dosyasını repoya eklemeyi unutma. `DATABASE_URL` gibi hassas değerleri boş bırakarak bu şablonu `.gitignore`'a **ekleme** — diğer geliştiricilerin kurulum yapabilmesi için repoda olmalıdır.

---

### API Dokümantasyonu

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır.

#### Haberler

---

##### `GET /news`
Tüm haberleri yayınlanma tarihine göre azalan sırada döner. Kaynak bilgileri (ad, slug) ile birlikte gelir.

**Yanıt:**
```json
[
  {
    "_id": "...",
    "title": "Haber başlığı",
    "publishedAt": "2025-01-01T00:00:00.000Z",
    "sourceId": {
      "name": "Kaynak Adı",
      "slug": "kaynak-adi"
    }
  }
]
```

---

##### `POST /crawl`
Crawler'ı manuel olarak tetikler. Crawler zaten çalışıyorsa `409` döner.

**Yanıt (Başarılı):**
```json
{
  "message": "Crawl tamamlandı",
  "inserted": 12,
  "skipped": 3
}
```

**Yanıt (Çakışma - 409):**
```json
{
  "error": "Crawler zaten çalışıyor"
}
```

---

#### Kaynaklar

##### `GET /sources`
Tüm haber kaynaklarını istatistikleriyle birlikte döner.

**Yanıt:**
```json
[
  {
    "id": "...",
    "name": "Kaynak Adı",
    "slug": "kaynak-adi",
    "isActive": true,
    "newsCount": 150,
    "categories": ["teknoloji", "gündem"],
    "feedCount": 2
  }
]
```

---

#### Diğer Endpoint'ler

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/health` | Sunucu sağlık durumu |
| `GET` | `/stats` | Genel istatistikler |
| `*` | `/admin/*` | Admin paneli işlemleri |

---

### Proje Yapısı

```
src/
├── api/
│   ├── routes/          # Fastify route tanımları
│   └── server.ts        # Fastify uygulama örneği
├── config/
│   └── env.ts           # Ortam değişkenleri
├── crawler/
│   ├── engine.ts        # Crawl motoru
│   ├── lock.ts          # Eş zamanlılık kilidi
│   └── scheduler.ts     # Cron zamanlayıcı
├── database/
│   ├── client.ts        # MongoDB bağlantısı
│   └── models/          # Mongoose modelleri (News, Source)
├── parsers/             # İçerik ayrıştırıcılar
├── utils/
│   └── logger.ts        # Logger
└── index.ts             # Uygulama giriş noktası
public/                  # Admin arayüzü (HTML/CSS/JS)
```

---

### Admin Paneli Kullanımı

Tarayıcıda `http://localhost:3000/admin.html` adresini aç.

#### Kaynak Ekleme

1. **Kaynak bilgilerini doldur:**
   - **Ad:** Kaynağın görünen adı (örn: NTV)
   - **Slug:** Benzersiz kısa ad (örn: ntv)
   - **Base URL:** Ana site adresi (örn: https://www.ntv.com.tr)
   - **Feed URL:** RSS adresi (örn: https://www.ntv.com.tr/turkiye.rss)
   - **Kategori:** Feed'in kategorisi (örn: turkiye)
2. **Preview butonu** ile feed'i test et
3. **Ekle** butonu ile kaydet

#### Kaynak Yönetimi

- **Aktif/Pasif:** Toggle ile kaynağı açıp kapat
- **Sil:** Kaynağı tamamen kaldır
- **Güncelle:** Feed URL'lerini değiştir

#### Örnek RSS URL'leri

| Kaynak | Kategori | Feed URL |
|--------|----------|----------|
| NTV | Türkiye | https://www.ntv.com.tr/turkiye.rss |
| TRT Haber | Gündem | https://www.trthaber.com/gundem_articles.rss |
| Sabah | Spor | https://www.sabah.com.tr/spor/rss.xml |

---

---

## 🇬🇧 English <a name="english"></a>

### What is it?

**haber-aggregator-backend** is a news aggregator backend service that automatically crawls multiple news sources, parses content, and serves it via a REST API. Built with Fastify, TypeScript, and MongoDB.

### Features

- 🕷️ Automatic crawler — periodically fetches news via scheduled tasks
- 📰 Content parsing — article cleaning with Readability and smart content extractor
- 🗄️ MongoDB integration — news and source management
- 🔒 Crawler locking — prevents concurrent crawler conflicts
- 🌐 Admin panel — ready-made UI in the `public/` directory
- ⚙️ Configurable cron intervals

---

### Installation

#### Requirements

- Node.js >= 24
- MongoDB (local or remote)
- TypeScript (included as devDependency)

#### Steps

```bash
# 1. Clone the repo
git clone https://github.com/burakaltinbicak/haber-aggregator-backend.git
cd haber-aggregator-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit the .env file (see below)

# 4. Start the application
npm start
```

#### `.env` Configuration

```env
PORT=3000
DATABASE_URL=mongodb://localhost:27017/haber-aggregator
CRAWLER_INTERVAL=*/10 * * * *
CLEANUP_INTERVAL=0 */12 * * *
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port the server listens on | `3000` |
| `DATABASE_URL` | MongoDB connection URI | `""` |
| `CRAWLER_INTERVAL` | Crawler run frequency (cron) | `*/10 * * * *` (every 10 min) |
| `CLEANUP_INTERVAL` | Frequency of the cleanup job that removes old/duplicate news from the database (cron) | `0 */12 * * *` (every 12 hours) |
> ⚠️ Make sure to include a `.env.example` file in the repo. Leave sensitive values (like `DATABASE_URL`) blank in this template and do **not** add it to `.gitignore` — other developers need it to get started.

---

### API Documentation

The server runs at `http://localhost:3000` by default.

#### News

---

##### `GET /news`
Returns all news sorted by publish date in descending order, populated with source info (name, slug).

**Response:**
```json
[
  {
    "_id": "...",
    "title": "Article title",
    "publishedAt": "2025-01-01T00:00:00.000Z",
    "sourceId": {
      "name": "Source Name",
      "slug": "source-name"
    }
  }
]
```

---

##### `POST /crawl`
Manually triggers the crawler. Returns `409` if the crawler is already running.

**Response (Success):**
```json
{
  "message": "Crawl tamamlandı",
  "inserted": 12,
  "skipped": 3
}
```

**Response (Conflict - 409):**
```json
{
  "error": "Crawler zaten çalışıyor"
}
```

---

#### Sources

##### `GET /sources`
Returns all news sources with their statistics.

**Response:**
```json
[
  {
    "id": "...",
    "name": "Source Name",
    "slug": "source-name",
    "isActive": true,
    "newsCount": 150,
    "categories": ["technology", "news"],
    "feedCount": 2
  }
]
```

---

#### Other Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/stats` | General statistics |
| `*` | `/admin/*` | Admin panel operations |

---

### Project Structure

```
src/
├── api/
│   ├── routes/          # Fastify route definitions
│   └── server.ts        # Fastify app instance
├── config/
│   └── env.ts           # Environment variables
├── crawler/
│   ├── engine.ts        # Crawl engine
│   ├── lock.ts          # Concurrency lock
│   └── scheduler.ts     # Cron scheduler
├── database/
│   ├── client.ts        # MongoDB connection
│   └── models/          # Mongoose models (News, Source)
├── parsers/             # Content parsers
├── utils/
│   └── logger.ts        # Logger
└── index.ts             # Application entry point
public/                  # Admin UI (HTML/CSS/JS)
```

---

### License

ISC