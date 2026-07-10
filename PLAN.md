# Pick For Me — Tamamlama Planı (ROADMAP)

> Bu dosya, projeyi tamamlamak için adım adım yol haritasıdır.
> Terminalden `claude` başlatıp bu dosyayı bağlam olarak verip fazları sırayla uygulatabilirsin.
> Repo kökine `PLAN.md` olarak koymanız önerilir.

---

## 1. Proje Özeti & Mevcut Durum

**Pick For Me**: Expo / React Native (TypeScript, SDK 54) ile yazılmış bir "karar verici" mobil uygulaması.

**Stack:** React 19 · React Native 0.81 · Expo 54 · React Navigation (stack + bottom tabs) · i18next (TR/EN) · Supabase (auth) · AsyncStorage + SecureStore · react-native-reanimated · react-native-svg · expo-haptics

**Mevcut araçlar (7):** Çark · Zar · Yazı-Tura · Renk Seçici · Fikir Üretici · Hızlı Görev · Film Seçici

**Çalışan kısımlar:** Navigasyon, i18n, tema/bileşenler (`GlassCard`, `ModernButton`, `DiceFace`), `PickEngine` rastgeleleştirme mantığı, yerel geçmiş (48 saat), demo-mode fallback (Supabase yoksa giriş atlanıyor).

**Tespit edilen eksikler / borçlar:**
- `README.md` ve dokümantasyon yok
- `.env` yok → Supabase kurulu değil, uygulama demo modunda
- Giriş/Kayıt ekranları **açık temalı** (`#f5f5f5`), uygulamanın geri kalanı koyu → görsel tutarsızlık
- `SettingsScreen`: tema değiştirme anahtarı **pasif/uygulanmamış**; logout mantığı tekrar ediyor
- Geçmiş yalnızca yerel; **bulut senkron yok**, **"geçmişi temizle" yok**
- Test / CI yok; **EAS build (apk/ipa) yapılandırması yok**
- Uygulama ikonları placeholder (~4KB)
- `tsconfig.json` boş `compilerOptions` (strict mode yok)
- Çark ve diğer araçlar **anlık giriş** alıyor; kaydedilebilir/yeniden kullanılabilir liste yok

---

## 2. Hedef

1. **Önce Google Play, sonra App Store** yayını (production).
2. İçerik/UX olgunlaşmadan auth/backend'e geçilmeyecek — **önce içeriyi mükemmelleştir**, sonra altyapı.
3. Para modeli: **freemium** — hafif ödüllü reklam + **v1'den itibaren abonelik** (aylık + yıllık, bölgesel fiyat). Tek seferlik/lifetime yok. AI **v2'de**.

---

## 3. Geliştirme Ortamı & Kurulum

**Önkoşullar:** Node.js LTS · Git · bir Expo hesabı. (Faz 5 derlemesi için ek olarak EAS CLI.)

**İlk kurulum (bir kez):**
```bash
npm install            # bağımlılıkları kur
npx expo start         # geliştirme sunucusu (Expo Go ile temel araçlar denenir)
```

**ÖNEMLİ kural — Expo Go vs dev build:** Temel araçlar + Faz 1–2 işleri **Expo Go**'da çalışır. Ama reklam (AdMob) ve abonelik (RevenueCat) **Expo Go'da ÇALIŞMAZ** — bunlar `app.json`'a config plugin + **özel dev build** (`eas build --profile development`) gerektirir. Yani Faz 3'ten itibaren fiziksel cihazda dev build şart.

**Paketler her fazın başında kurulur** (Expo uyumlu sürüm için daima `npx expo install`). Özet:

| Faz | Kurulacaklar |
|---|---|
| Faz 1 (animasyon) | `moti`, `react-native-gesture-handler` (reanimated zaten var; çark için gerekirse `@shopify/react-native-skia`) |
| Faz 2 (paylaşım/QR) | `react-native-view-shot`, `expo-sharing`, `expo-linking`, `react-native-qrcode-svg` |
| Faz 3 (reklam+IAP) | `react-native-google-mobile-ads`, `react-native-purchases` (+ config plugin + dev build) |
| Faz 5 (yayın) | `npm i -g eas-cli` |

**Geliştirme aracı (opsiyonel — Claude Code workflow): gstack**
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```
(Bun gerekir. Sadece **global** kullan, repoya "team mode" commit etme. RN'e uymayan iOS/browser-QA skill'lerini atla; işine yarayanlar: `/autoplan`, `/plan-eng-review`, `/review`, `/design-review`, `/cso`, `/ship`.)

---

## 4. Faz Planı

### FAZ 0 — Hazırlık & Temizlik
- [ ] `tsconfig.json` içine `"strict": true` ve makul sıkı ayarlar ekle; tip hatalarını gider.
- [ ] `.env` dosyasını `.env.example`'dan üret; şimdilik demo mode korunur (Supabase boş kalabilir).
- [ ] `README.md` yaz: kurulum (`npm install`, `npx expo start`), proje yapısı, demo mode açıklaması.
- [ ] `npx expo-doctor` / `npx tsc --noEmit` temiz geçsin.
- [ ] Repo hijyeni: gereksiz dosyalar, ölü kod (`SettingsScreen` tekrarlanan logout) temizliği.

**Kabul:** Proje hatasız derleniyor, demo modda sorunsuz açılıyor, README mevcut.

### FAZ 1 — UI/UX Cila + Bug Fix + Mevcut Araç İyileştirme (ÖNCELİK)
- [ ] **Kur:** `npx expo install moti react-native-gesture-handler` (Moti = reanimated üstünde Framer-Motion benzeri API; Framer Motion KULLANMA — web-only). Çark için gerekirse `@shopify/react-native-skia`.
- [ ] **Auth ekranlarını koyu temaya çek** (`LoginScreen`, `RegisterScreen`): `Theme` renklerini kullan, marka tutarlılığı sağla.
- [ ] **`SettingsScreen` tema anahtarı**: ya gerçek açık/koyu tema desteği ekle ya da anahtarı tamamen kaldır (şimdilik koyu kal + kaldırmak daha hızlı). Tekrarlanan logout'u tek yere indir; sürüm bilgisini koru.
- [ ] **Çark (`WheelOfFortuneScreen`) iyileştirme**: daha akıcı dönüş animasyonu, dilim renkleri/etiketleri, dönüş sonrası net vurgulu galip, haptik geri bildirim.
- [ ] Diğer araçlarda mikro-etkileşimler: zar atış animasyonu, yazı-tura çevirme, sonuç ekranı geçişleri (mevcut spring/fade'i koru ve genişlet).
- [ ] **Boş durumlar (empty states)** ve hata durumları her ekranda tutarlı.
- [ ] Tutarlı boşluk/tipografi: `Theme.spacing` ve font ölçeklerini her ekranda uygula.
- [ ] **Geçmişi temizle** butonu (`ResultScreen` history modu).
- [ ] Erişilebilirlik: dokunma hedefleri ≥44px, kontrast, `accessibilityLabel`.

**Kabul:** Tüm ekranlar tek bir koyu tema dilinde; çark belirgin biçimde daha akıcı; tüm araçlar haptik + animasyonla cilalı; geçmiş temizlenebiliyor.

### FAZ 2 — Yeni Özellikler
- [ ] **Kur:** `npx expo install react-native-view-shot expo-sharing expo-linking react-native-qrcode-svg` (kayıtlı listeler için ekstra paket yok — mevcut AsyncStorage).
- [ ] **Kaydedilebilir özel çark/liste** (rakiplerin 1 numaralı kancası):
  - İsimli liste/çark oluştur, düzenle, sil, yeniden kullan.
  - AsyncStorage'da sakla (`LocalStorage` üzerinden); şema: `{ id, name, type, items[], createdAt }`.
  - Çark ve diğer uygun araçlar kayıtlı listelerden besleniyor.
- [ ] **Sonuç paylaşımı**: sonucu görsel olarak yakala (`react-native-view-shot`) ve paylaş (`expo-sharing`) + opsiyonel QR (`react-native-qrcode-svg`) / derin bağlantı (`expo-linking`).
- [ ] **Karar Turnuvası / Eleme** (yeni araç):
  - Kullanıcı seçenek listesi girer → ikişerli eşleştirme → her turda kullanıcı kazananı seçer → tek galip kalana dek bracket.
  - Tek/çift sayıda seçenek (bye) yönetimi; tur ilerleme göstergesi; final sonucu paylaşılabilir.
  - Mantığı `PickEngine`'e `buildBracket()` / `advance()` olarak ekle.
- [ ] **Sıra & Takım oluşturucu** (yeni araç):
  - Mod A: listeyi rastgele **sıraya** diz (kim önce gider).
  - Mod B: kişileri **N rastgele takıma** böl (eşit/dengeli dağıtım).
  - `PickEngine`'e `shuffleOrder()` ve `splitTeams(items, n)` ekle.
- [ ] **Statik içerik paketleri** (AI yerine, 0 maliyet, offline): akşam yemeği fikirleri, türlere göre filmler, görevler/challenge, doğruluk-cesaret vb. JSON olarak `src/content/` altında; `IdeaGenerator`/`MoviePicker` bunlardan beslensin.
- [ ] Yeni araçları `HomeScreen` `TOOLS` dizisine ve `navigation/index.tsx`'e ekle; TR/EN i18n anahtarlarını gir.

**Kabul:** Kayıtlı listeler kalıcı; sonuç paylaşılabilir; Turnuva ve Sıra/Takım araçları çalışıyor ve i18n'li; içerik paketleri offline çalışıyor.

### FAZ 3 — Monetizasyon (freemium)
- [ ] **Kur:** `npx expo install react-native-google-mobile-ads react-native-purchases` → `app.json`'a config plugin'leri ekle → **dev build al** (`eas build --profile development`). Bu fazdan itibaren Expo Go yetmez.
- [ ] **Reklam (hafif)**: öncelik **ödüllü video** (kullanıcı isteyerek izler, puanı batırmaz); çok seyrek banner. Geçiş reklamı kullanılırsa **3-5 dakikada bir** sınırı (frequency cap).
  - SDK: Google AdMob (`react-native-google-mobile-ads`).
- [ ] **Abonelik (v1'den itibaren) — aylık + yıllık** (tek seferlik / lifetime YOK):
  - **Aylık $1.99** (yer tutucu — netleştirilecek) / **Yıllık $7.99** (varsayılan seçili, "ayda $0.67 · %67 tasarruf" çapasıyla).
  - **Bölgesel fiyat (yıllık):** TR + ROW **$7.99** · Avrupa **€8.99** · ABD **$10.99**. Aylıklar buna oranlı. TR daha da aşağı çekilebilir (hacim için).
  - Opsiyonel **3–7 günlük ücretsiz deneme** (yıllıkta LTV'yi ~%35 artırır).
  - **Net etiketleme**: "aylık/yıllık" açıkça yazılı, gizli yenileme yok (kategorinin 1 numaralı şikayeti bu).
  - IAP altyapısı: RevenueCat (önerilen — çapraz platform + abonelik/deneme yönetimi kolay).
  - **Small Business Program'a kaydol** (Apple + Google) → %15 komisyon, satışın %85'i sende.
- [ ] **Pro gating**: özellik bayrakları (`isPro`) için tek bir context/store; kilitli özelliklerde net paywall ekranı.

**Ücretsiz vs Pro farkı** (reklamsızlık tek başına yetmez; güç kullanıcı değeri ekle):

| | Ücretsiz | Pro |
|---|---|---|
| 7 temel araç + Turnuva + Sıra/Takım | tam | tam |
| Reklam | Hafif ödüllü | Yok |
| Kayıtlı liste/çark | ~3 sınırlı | Sınırsız |
| Liste başına seçenek | ~20 sınırlı | Sınırsız |
| Temalar / çark görünümü / ses | 1 koyu tema | Premium temalar + özelleştirme |
| Ağırlıklı seçim (olasılık) | — | ✓ |
| İçerik paketleri | Temel | Tümü |
| Geçmiş | 48 saat | Genişletilmiş + (Faz 4) bulut senkron |
| Paylaşımda filigran | Var | Yok |

**Kabul:** Ücretsiz kullanıcıda hafif reklam + sınırlı özellik; Pro alınca reklamlar kalkıyor + tablo açılıyor; abonelik/deneme durumu kalıcı ve doğru senkron.

### FAZ 4 — Auth & Bulut Senkron (içerik olgunlaşınca)
- [ ] Supabase auth'u gerçek `.env` ile aktive et (hesabın hazır) — veya alternatif değerlendir (Clerk/Firebase Auth). Supabase muhtemelen yeterli + ücretsiz katman.
- [ ] Giriş akışını cila: şifre sıfırlama, e-posta doğrulama, hata mesajları.
- [ ] **Bulut senkron**: kayıtlı listeler + geçmiş cihazlar arası (Supabase tablosu + RLS). Bu, aboneliğin "tekrar eden değer" gerekçesidir → "neden her ay/yıl ödüyorum?" sorusunu cevaplar.

**Kabul:** Gerçek hesap aç/giriş yap çalışıyor; kayıtlı listeler buluta senkron oluyor.

### FAZ 5 — Yayın Altyapısı
- [ ] **Kur:** `npm i -g eas-cli` → `eas login` → `eas build:configure`.
- [ ] **Gerçek uygulama ikonları + splash** (placeholder'ları değiştir): adaptive icon, favicon, splash.
- [ ] **EAS Build** kur: `eas.json` (development / preview / production profilleri), `eas build -p android` ile APK/AAB.
- [ ] **iOS 26 SDK** ile derle (Nisan 2026 sonrası zorunlu) — Expo SDK 54 bunu karşılar, teyit et.
- [ ] Mağaza materyalleri: ekran görüntüleri, açıklama (ASO odaklı: "hepsi bir arada, temiz, az reklam"), anahtar kelimeler, **gizlilik politikası URL'i** (zorunlu).
- [ ] Play Console + App Store Connect kurulumu; iç test → kapalı test → yayın.

**Kabul:** Üretim AAB/IPA üretiliyor; mağaza listelemesi hazır; Play'de iç test yayını alınmış.

---

## 5. v2 Backlog (sonra)
- **AI ile liste doldurma** — Pro'nun arkasına kilitli (API maliyetini ödeyen kullanıcılar finanse eder); küçük ücretsiz kota + cache. Trend: AI'lı uygulamalar ücretsizden ödemeye %52 daha iyi çeviriyor ama churn %30 daha yüksek.
- **Fiyat optimizasyonu**: yıllık $7.99 bütçe segmenti (medyan ~$38). Veriyle daha çok gelir hedeflenirse yıllık $9.99–11.99'a çekilebilir (dönüşüm kaybı minimal). A/B test.
- **Ağırlıklı seçim**, **Sallayarak seç** (ek modlar).
- Uzaktan Birlikte Seç: farklı cihazlardan oda kodu/QR ile eşleştirme (Supabase Realtime) — Pro özelliği adayı.
- Gamification (seri/başarımlar), tema mağazası.

---

## 6. Monetizasyon Özeti (gerekçeli)

**Model:** Ücretsiz indir (güçlü ücretsiz katman) → hafif ödüllü reklam → **v1'den itibaren abonelik: aylık $1.99 / yıllık $7.99** (bölgesel) → v2'de **AI + bulut senkron** ile değer artışı. Tek seferlik / lifetime YOK.

**Salt abonelik riski ve çözümü:** Ara sıra açılan utility'de salt abonelik, kategorinin en sık öfke kaynağı (belirsiz/zoraki yenileme). Bertaraf: güçlü ücretsiz katman + net etiketleme (aylık/yıllık açık) + ucuz yıllık + aboneliğin değerini **bulut senkron (Faz 4) + premium temalar + sınırsız kayıt + sürekli içerik** ile gerekçelendirme.

**Reklam gerçeği (2026 eCPM):** banner global $0.20–0.80 · interstitial $2.50–5.00 · ödüllü video $8–18 (Tier-1 daha yüksek). Utility, oyunlardan %20–30 az kazanır. Ciddi reklam geliri **10.000+ DAU**'dan sonra başlar.

**Fiyat = maliyet değil, değer:** Sabit maliyetin ~$99/yıl (Apple). Maliyet, 1.000 kullanıcıda ~$8/yıl, 100.000 kullanıcıda <$2/yıl'lık bir fiyatla zaten kapanır. Kâr kaldıracı **hacim × dönüşüm**, fiyat değil.

**Final fiyat kurgusu:** Aylık **$1.99** (yer tutucu) · Yıllık **$7.99** (varsayılan, "ayda $0.67 · %67 tasarruf") · 3–7 gün deneme. **Bölgesel yıllık:** TR + ROW $7.99 · Avrupa €8.99 · ABD $10.99.

Yıllık $7.99 ile gelir (abone başı net $6.79, komisyon %15 sonrası):

| Yıllık abone | ~Net gelir/yıl | ~Net kâr/yıl |
|---|---|---|
| 100 | ~$679 | ~$580 |
| 1.000 | ~$6.790 | ~$6.690 |
| 10.000 | ~$67.900 | ~$66.000 |

(%2 dönüşümle: 100 abone ≈ 5.000 indirme, 1.000 abone ≈ 50.000 indirme.)

**Düşük bütçe stratejisi:** Para harcamayı (AI API ya da ücretli kullanıcı edinme) ertele. En yüksek getiri **sıfır maliyetli büyüme**: güçlü ASO + "hepsi bir arada, az reklam" konumlandırması + ağızdan ağıza. AI yerine **statik içerik paketleri** = 0 maliyet, değerin ~%80'i.

---

## 7. Rakip Analizi Özeti

- Kategori kalabalık ama çoğu **tek amaçlı + reklam dolu** (Wheel of Names, Picker Wheel: yalnızca çark, reklamlı).
- Şikayetler: aşırı reklam (5 dk kullanımın 3 dk'sı reklam), belirsiz IAP (tek mi abonelik mi).
- En iyi örnekler (Decision Jar, Random Choice): **hepsi bir arada + offline + koyu mod + kaydedilebilir liste + paylaşım + gamification**.
- **Senin kazanma açın:** Tek uygulamada çok araç + temiz koyu UI + offline + dürüst/az reklam. Kaydedilebilir liste + paylaşım + Turnuva/Takım araçlarıyla parite + farklılaşma.

---

## 8. Önerilen Sıra (özet)
**Faz 0 → Faz 1 (cila) → Faz 2 (özellikler) → Faz 3 (monetizasyon) → Faz 4 (auth/senkron) → Faz 5 (yayın)** → v2 (AI, yıllık abonelik).

## 9. Claude Code ile Çalışma Notları
- Her fazı ayrı oturum/branch olarak ele al (`feat/fazN`); faz sonunda derleme + manuel test.
- Yeni araç eklerken sırayla dokun: `PickEngine` mantığı → ekran (`src/screens/tools/`) → `navigation/index.tsx` → `HomeScreen` TOOLS → `i18n/locales/{tr,en}.json`.
- Animasyon: **react-native-reanimated** temel; deklaratif mikro-etkileşimler için **Moti**. **Framer Motion kullanma** (web-only).
- Reklam/IAP/EAS adımları **fiziksel cihazda dev build** gerektirir (Expo Go yetmez).
- Her commit/PR'da `npx tsc --noEmit` ve `npx expo-doctor` temiz olsun.
- gstack varsa: plan için `/autoplan` + `/plan-eng-review`, cila için `/design-review`, güvenlik için `/cso`, sevkiyat için `/ship`.
