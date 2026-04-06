# Facebook Otomatik Paylaşım Paneli

Next.js 14 (App Router), TypeScript, Prisma, NextAuth ve servis katmanlı mimari ile hazırlanmış, koyu temalı premium bir yönetim paneli. Arayüz tamamen Türkçedir.

**Kaynak kod:** [github.com/Miracle4AE/facebook-oto-paylasim](https://github.com/Miracle4AE/facebook-oto-paylasim)

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

- Node.js 18+ (`package.json` içinde `engines`; `.nvmrc` ile Node 20 önerilir)
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
| `NEXTAUTH_URL` | Örn. `http://localhost:3000` (üretimde tam site URL’si) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` ile üretin |
| `CRON_SECRET` | Cron endpoint için güçlü gizli anahtar |
| `NEXT_PUBLIC_APP_NAME` | İsteğe bağlı; başlıkta kullanılır |

Facebook Graph / OAuth (gerçek paylaşım için):

| Değişken | Açıklama |
|----------|----------|
| `FACEBOOK_PUBLISH_MODE` | `mock` (varsayılan) veya `graph` |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Meta uygulama kimlikleri |
| `FACEBOOK_GRAPH_VERSION` | Örn. `v21.0` |
| `TOKEN_ENCRYPTION_KEY` | İsteğe bağlı; token şifreleme (32 bayt base64). Yoksa `NEXTAUTH_SECRET` türetilir |

İsteğe bağlı:

- `FACEBOOK_MOCK_SUCCESS_RATE` — Mock modda başarı oranı (0–1)
- `MEDIA_STORAGE_DRIVER` — İleride `s3` vb.

**Güvenlik:** `.env` asla repoya eklenmez; yalnızca `.env.example` kullanın.

## Veritabanı

- **PostgreSQL** (`prisma/schema.prisma`). `DATABASE_URL` Neon, Supabase veya Vercel Postgres connection string’i olmalı (`?sslmode=require` genelde gerekir).
- Şemada enum yerine **string** alanlar kullanılmıştır; uygulama tipleri `types/domain.ts` içindedir.
- İlk kurulum: `.env` içinde `DATABASE_URL` ayarlayın, ardından `npx prisma db push` ve `npm run db:seed`.

## Sorun giderme

- **Windows’ta `prisma generate` / `npm run build` sırasında `EPERM: operation not permitted` (query_engine yeniden adlandırma):** Genelde `node_modules/.prisma` içindeki dosya kilitlenir (çalışan `next dev`, IDE, antivirüs). `next dev` ve diğer Node süreçlerini kapatıp tekrar deneyin; gerekirse `node_modules` ve `package-lock.json` ile temiz kurulum yapın.

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
| `npm run typecheck` | `tsc --noEmit` (CI ile uyumlu) |
| `npm run db:push` | Şemayı veritabanına uygula |
| `npm run db:seed` | Örnek veri |
| `npm run db:studio` | Prisma Studio |

## Lisans

Özel proje — ihtiyacınıza göre lisanslayın.
