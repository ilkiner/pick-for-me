# Pick For Me — Claude Code Promptları

> Bu dosyayı PLAN.md ile birlikte repo köküne koy.
> Her faz için hazır prompt var — kopyala, Claude Code'a yapıştır.

---

## Claude Code Kurulumu (bir kez)

### 1. Kur (Windows — PowerShell)
```powershell
irm https://claude.ai/install.ps1 | iex
```
> Alternatif: `winget install Anthropic.ClaudeCode`
> Node.js gerekmez — native installer her şeyi halleder.

### 2. Hesap
**Claude Pro ($20/ay)** gerekir — ücretsiz plan Claude Code'u kapsamıyor.
Yoksa Anthropic API key ile de çalışır (console.anthropic.com → API Keys).

### 3. İlk başlatma
```bash
# Repo klasörüne git
cd pick-for-me

# Claude Code'u başlat
claude
```
İlk çalıştırmada tarayıcı açılır, hesabınla giriş yaparsın — sonra hazır.

### 4. gstack (opsiyonel, iş akışı araçları)
```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```
(Bun gerektirir. Bir kez kurulur, global kalır.)

---

## Kullanım Şekli

1. `cd pick-for-me` → `claude` yaz → başlat
2. Aşağıdan ilgili faz promptunu **kopyala → yapıştır → Enter**
3. Claude Code PLAN.md'yi okur, adımları uygular
4. Faz bitmeden bir sonraki faza geçme

---

## FAZ 0 — Hazırlık & Temizlik

```
PLAN.md'yi oku ve FAZ 0 adımlarını uygula:

- tsconfig.json'a "strict": true ve temel sıkı ayarları ekle, tip hatalarını gider
- .env dosyasını .env.example'dan oluştur (Supabase anahtarları boş kalsın, demo mode korunsun)
- README.md yaz: kurulum adımları, proje yapısı, demo mode açıklaması
- SettingsScreen'deki tekrar eden logout mantığını tek yere topla
- Gereksiz/ölü kodları temizle
- npx tsc --noEmit ve npx expo-doctor temiz geçsin

feat/faz0 adında yeni branch aç, küçük anlamlı commit'lerle çalış.
Bitince ne yaptığını özetle.
```

---

## FAZ 1 — UI/UX Cila + Animasyonlar

```
PLAN.md'yi oku ve FAZ 1 adımlarını uygula.

Önce şunu kur:
npx expo install moti react-native-gesture-handler

Sonra:
- LoginScreen ve RegisterScreen'i koyu temaya çek (Theme renklerini kullan, #f5f5f5 kaldır)
- Çark animasyonunu iyileştir: reanimated + Moti ile akıcı dönüş, net galip vurgusu, haptik
- Zar, yazı-tura ve diğer araçlarda mikro-etkileşimler ekle
- SettingsScreen tema anahtarını kaldır (şimdilik koyu tema sabit kalsın)
- Her ekranda boş durum (empty state) ve hata mesajı tutarlı olsun
- Dokunma hedefleri en az 44px, accessibilityLabel ekle
- ResultScreen'e geçmişi temizle butonu ekle
- Tutarlı boşluk ve tipografi (Theme.spacing kullan)

ÖNEMLİ: Framer Motion KULLANMA — web-only, React Native'de çalışmaz.
Animasyonlar için: react-native-reanimated (temel) + Moti (deklaratif mikro-etkileşimler).
Çark dönüşü için reanimated + gesture-handler kullan.

feat/faz1 branch'inde çalış. Her commit öncesi npx tsc --noEmit temiz olsun.
Bitince /design-review komutuyla UI'ı kontrol et ve bulduğun sorunları düzelt.
```

---

## FAZ 2 — Yeni Özellikler

```
PLAN.md'yi oku ve FAZ 2 adımlarını uygula.

Önce şunu kur:
npx expo install react-native-view-shot expo-sharing expo-linking react-native-qrcode-svg

Sonra:

1. Kaydedilebilir özel çark/liste:
   - İsimli liste oluştur, düzenle, sil, yeniden kullan
   - AsyncStorage'da sakla, şema: { id, name, type, items[], createdAt }
   - Çark ve uygun araçlar bu kayıtlı listelerden beslensin

2. Sonuç paylaşımı:
   - react-native-view-shot ile sonuç ekranını görsel olarak yakala
   - expo-sharing ile cihaz paylaşım menüsünü aç
   - Opsiyonel: react-native-qrcode-svg ile QR üret

3. Karar Turnuvası / Eleme (yeni araç):
   - Kullanıcı seçenek listesi girer
   - İkişerli eşleştirme, her turda kullanıcı kazananı seçer, tek galip kalana dek
   - Tek/çift seçenek yönetimi (bye), tur ilerleme göstergesi
   - PickEngine'e buildBracket() ve advance() ekle

4. Sıra & Takım oluşturucu (yeni araç):
   - Mod A: listeyi rastgele sırala (kim önce gider)
   - Mod B: kişileri N rastgele takıma böl
   - PickEngine'e shuffleOrder() ve splitTeams(items, n) ekle

5. Statik içerik paketleri (AI yok, 0 maliyet):
   - src/content/ altında JSON dosyaları: yemek fikirleri, filmler, görevler, doğruluk-cesaret
   - IdeaGenerator ve MoviePicker bu paketlerden beslensin

6. Yeni araçları bağla:
   - HomeScreen TOOLS dizisine ekle
   - navigation/index.tsx'e ekle
   - i18n/locales/tr.json ve en.json'a çeviri anahtarları gir

feat/faz2 branch'i. npx tsc --noEmit temiz olsun.
```

---

## FAZ 3 — Monetizasyon

```
PLAN.md'yi oku ve FAZ 3 adımlarını uygula.

Önce şunu kur:
npx expo install react-native-google-mobile-ads react-native-purchases

Sonra app.json'a her iki paketin config plugin'ini ekle.
Bu fazdan itibaren Expo Go yetmez — fiziksel cihazda dev build gerekir:
eas build --profile development

Adımlar:

1. Reklam (AdMob):
   - Öncelik ödüllü video (kullanıcı gönüllü izler)
   - Çok seyrek banner (ana ekran veya sonuç ekranı)
   - Geçiş reklamı kullanılırsa frequency cap: 3-5 dakikada bir
   - Ücretsiz kullanıcılara göster, Pro kullanıcılara GÖSTERME

2. Abonelik (RevenueCat):
   - Aylık $1.99 / Yıllık $7.99 (varsayılan seçili)
   - Paywall ekranı: "ayda $0.67 · %67 tasarruf" çapasıyla yıllığı vurgula
   - 3-7 günlük ücretsiz deneme
   - Net etiketleme: aylık/yıllık açıkça yazılı, gizli yenileme yok
   - Bölgesel fiyat: uygulama içi satın alma konsollarından ayarlanacak
     (TR+ROW $7.99 · Avrupa €8.99 · ABD $10.99)

3. Pro gating:
   - isPro için tek bir context/store oluştur
   - PLAN.md'deki Ücretsiz vs Pro tablosuna göre özellikleri kilitle/aç
   - Kilitli özellikte net paywall ekranı göster

feat/faz3 branch'i.
```

---

## FAZ 4 — Auth & Bulut Senkron

```
PLAN.md'yi oku ve FAZ 4 adımlarını uygula.

- .env'e gerçek Supabase URL ve anon key'i ekle
- Supabase auth'u aktive et: giriş, kayıt, şifre sıfırlama, e-posta doğrulama akışları
- Giriş akışını cila: loading durumları, hata mesajları, yönlendirmeler
- Bulut senkron: kayıtlı listeler + geçmiş Supabase tablosunda saklanıyor, RLS ile korumalı
- Cihazlar arası senkron çalışıyor

feat/faz4 branch'i.
gstack varsa: /cso komutuyla Supabase RLS + IAP güvenlik denetimi yap.
```

---

## FAZ 5 — Yayın Altyapısı

```
PLAN.md'yi oku ve FAZ 5 adımlarını uygula.

Önce:
npm i -g eas-cli
eas login
eas build:configure

Sonra:
- assets/ klasöründeki placeholder ikonları gerçek tasarımla değiştir
  (icon.png 1024x1024, adaptive-icon.png, splash.png, favicon.png)
- eas.json oluştur: development / preview / production profilleri
- Android: eas build -p android --profile production → AAB üret
- iOS 26 SDK uyumunu teyit et (Expo SDK 54 zaten uyumlu, kontrol et)
- Mağaza açıklaması: ASO odaklı başlık + açıklama + anahtar kelimeler
  ("hepsi bir arada karar verici, çark, zar, turnuva, offline")
- Gizlilik politikası URL'i hazırla (Play Store zorunlu kılar)
- Play Console: iç test → kapalı test → yayın

feat/faz5 branch'i.
```

---

## Genel Kurallar (her fazda geçerli)

- Her faz ayrı branch: `feat/fazN`
- Her commit öncesi: `npx tsc --noEmit` + `npx expo-doctor` temiz
- Yeni araç eklerken sıra: PickEngine → ekran (src/screens/tools/) → navigation → HomeScreen → i18n
- Demo mode korunsun (Faz 4'e kadar Supabase'e dokunma)
- Framer Motion kullanma (web-only) → Moti + Reanimated kullan
- Faz 3'ten itibaren Expo Go yetmez → fiziksel cihazda dev build
