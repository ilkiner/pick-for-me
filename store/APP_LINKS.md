# Android App Links — kurulum

Şifre sıfırlama ve e-posta doğrulama linkleri `pickforme://` özel şemasından
doğrulanmış HTTPS App Links'e taşındı. Sebep: özel bir şemayı cihazdaki herhangi
bir uygulama kaydedebilir ve linkteki `access_token`'ı alabilir — doğrudan hesap
ele geçirme. App Links'te Android, alan adından imza parmak izini doğrular.

Uygulama tarafı hazır (`app.json` intent-filter + `src/core/authLinks.ts`).

> **Durum: 1. ve 2. adım tamamlandı.** `store/assetlinks.json` gerçek parmak
> izleriyle dolu ve dosya `https://ilkiner.github.io/.well-known/assetlinks.json`
> adresinde yayında. Google'ın Digital Asset Links API'si iki parmak izini de
> `com.pickforme.app` için hatasız döndürüyor:
>
> ```
> https://digitalassetlinks.googleapis.com/v1/statements:list\
> ?source.web.site=https://ilkiner.github.io\
> &relation=delegate_permission/common.handle_all_urls
> ```
>
> Adımlar, imza anahtarı değişirse (yeni keystore, Play App Signing sıfırlaması)
> tekrar uygulanmak üzere aşağıda duruyor. 3. ve 4. adım hâlâ elle yapılmalı.

---

## 1. assetlinks.json'u yayınla

Dosya şu ADRESTE olmalı — başka bir yerde işe yaramaz:

```
https://ilkiner.github.io/.well-known/assetlinks.json
```

⚠️ Dikkat: bu **alan adının kökü**, `/pick-for-me/` altı değil. `ilkiner.github.io`
bir *kullanıcı sitesi* olduğu için bu dosya **`ilkiner.github.io` adlı ayrı bir
repo**dan servis edilir. O repo yoksa oluşturulmalı:

```
ilkiner.github.io/           <- yeni repo (GitHub Pages otomatik yayınlar)
├── .nojekyll                <- BOŞ dosya; olmazsa Jekyll .well-known'ı gizler
└── .well-known/
    └── assetlinks.json      <- bu repodaki store/assetlinks.json'un doldurulmuş hâli
```

Yayınlandıktan sonra tarayıcıda aç ve JSON döndüğünü doğrula (404 ya da HTML
gelirse `.nojekyll` eksiktir).

## 2. SHA-256 parmak izlerini doldur

`store/assetlinks.json` içinde iki yer tutucu var. **İkisini de doldur** —
farklı anahtarlarla imzalanmış derlemeler var:

**a) Play App Signing sertifikası** (Play'den inen sürüm — asıl olan)
Play Console → uygulaman → **Test and release → Setup → App integrity →
App signing** → *App signing key certificate* → **SHA-256 certificate fingerprint**.

Google APK'yı yeniden imzaladığı için kullanıcıdaki uygulamanın parmak izi budur.
Bu eksikse yayındaki uygulamada App Links **çalışmaz**.

**b) EAS upload/yükleme anahtarı** (doğrudan kurulan APK — preview profili)
```
npx eas credentials --platform android
```
→ production profilini seç → *Keystore: Manage everything* → parmak izi listelenir.

Bu eksikse Play dışından kurduğun test APK'larında App Links çalışmaz (yayın
sürümünü etkilemez).

Parmak izi biçimi büyük harf ve iki nokta üst üste ayraçlı olmalı:
`AB:CD:EF:...` (64 hex karakter, 32 grup).

## 3. Supabase Redirect URLs

Dashboard → Authentication → URL Configuration → **Redirect URLs**:

```
https://ilkiner.github.io/pick-for-me/reset-password
https://ilkiner.github.io/pick-for-me/verify-email
```

Geliştirme (Expo Go) için IP'ne göre ayrıca:
```
exp://192.168.1.34:8081/--/reset-password
exp://192.168.1.34:8081/--/verify-email
```

Eski `pickforme://*` girdilerini **hemen silme**: daha önce gönderilmiş mailler
hâlâ o adresi taşıyor ve uygulama özel şemayı tanımaya devam ediyor. Linklerin
geçerlilik süresi dolduktan sonra (birkaç gün) kaldırılabilir.

**Site URL** hâlâ `http://localhost:3000` ise değiştir:
`https://ilkiner.github.io/pick-for-me/reset-password`

## 4. Doğrulama

Derleme aldıktan ve kurduktan sonra:

```bash
# Android'in dogrulama durumu
adb shell pm get-app-links com.pickforme.app
# "verified" gormelisin; "legacy_failure" ise assetlinks erisilemiyor demektir

# Elle tetikleme testi
adb shell am start -a android.intent.action.VIEW \
  -d "https://ilkiner.github.io/pick-for-me/reset-password"
```

Google'ın doğrulayıcısı:
https://developers.google.com/digital-asset-links/tools/generator

⚠️ Doğrulama, uygulama **kurulurken** yapılır. assetlinks.json'u uygulamayı
kurduktan sonra yayınlarsan yeniden kurman (ya da `adb shell pm verify-app-links
--re-verify com.pickforme.app`) gerekir.

## Geriye dönük uyumluluk

`pickforme://` şeması `app.json`'da duruyor ve `authLinks.ts` onu tanımaya devam
ediyor — eski mailler ve Expo Go için. Yeni gönderilen mailler HTTPS kullanıyor
(`authRedirectUrl()`, geliştirmede yerel şemaya düşer).
