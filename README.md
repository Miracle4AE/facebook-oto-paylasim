# Facebook Otomatik Paylaşım Paneli

Next.js 14 (App Router), TypeScript, Prisma, NextAuth ve servis katmanlı mimari ile hazırlanmış, koyu temalı premium bir yönetim paneli. Arayüz tamamen Türkçedir.

## Özellikler

- E-posta / şifre ile güvenli oturum (NextAuth, JWT)
- Kontrol paneli istatistikleri ve son gönderimler
- Facebook / Meta entegrasyonu için soyut servis katmanı (mock varsayılan, Graph API için hazır)
- Hedef kanal yönetimi (arama / filtre)
- İçerik oluşturma, medya yükleme (yerel disk; S3/Cloudinary için `services/media` genişletilebilir)
- Zamanlama kuralları (saat dilimi, günlük / haftalık / tek sefer)
- Cron ile kuyruk işleme (`/api/cron/publish`)
- Paylaşım geçmişi ve loglar

## Gereksinimler

- Node.js 18+
- npm veya pnpm

## Kurulum

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Geliştirme adresi: [http://localhost:3000](http://localhost:3000)

### Demo hesap

- E-posta: `demo@paylasim.app`
- Şifre: `demo123456`

## Ortam değişkenleri

`.env.example` dosyasına bakın. Minimum:

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | SQLite: `file:./dev.db` |
| `NEXTAUTH_URL` | Örn. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` ile üretin |
| `CRON_SECRET` | Cron endpoint için güçlü gizli anahtar |

İsteğe bağlı:

- `FACEBOOK_PUBLISH_MODE=graph` — gerçek Graph çağrıları için (`services/facebook/facebook-graph.service.ts`)
- `FACEBOOK_GRAPH_VERSION` — Varsayılan `v21.0`
- `MEDIA_STORAGE_DRIVER` — İleride `s3` vb.

## Veritabanı

- Geliştirme: **SQLite** (`prisma/schema.prisma`)
- SQLite ile Prisma şemasında enum yerine **string** alanlar kullanılmıştır; uygulama tipleri `types/domain.ts` içindedir.
- PostgreSQL’e geçiş: `datasource` içinde `provider = "postgresql"` ve `DATABASE_URL` güncelleyin; ardından `npx prisma migrate dev` ile migration oluşturun. İsterseniz PostgreSQL tarafında bu alanları native enum’a çevirebilirsiniz.

## Vercel dağıtımı

1. Projeyi GitHub’a yükleyin.
2. Vercel’de yeni proje oluşturup repoyu bağlayın.
3. Ortam değişkenlerini ekleyin (`NEXTAUTH_URL` üretim URL’si olmalı).
4. Build: `npm run build` (postinstall ile `prisma generate` çalışır).
5. **SQLite Vercel’de kalıcı dosya sistemi olmadığından üretimde PostgreSQL kullanın** (Vercel Postgres veya harici Neon/Supabase).
6. `vercel.json` içinde Cron tanımı vardır (`/api/cron/publish`). Vercel proje ayarlarında `CRON_SECRET` tanımlayın; istek `Authorization: Bearer <CRON_SECRET>` ile gelir.

## Mimari notlar

| Katman | Konum |
|--------|--------|
| UI | `app/`, `components/` |
| Sunucu işlemleri | `actions/` |
| İş kuralları / dış sistem | `services/` |
| Zamanlayıcı | `services/scheduler/scheduler.service.ts` |
| Facebook gönderimi | `services/facebook/` — gerçek API: `facebook-graph.service.ts`, demo: `mock-facebook-publish.service.ts` |
| Medya | `services/media/media.service.ts` |

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run db:push` | Şemayı veritabanına uygula |
| `npm run db:seed` | Örnek veri |
| `npm run db:studio` | Prisma Studio |

## Lisans

Özel proje — ihtiyacınıza göre lisanslayın.
