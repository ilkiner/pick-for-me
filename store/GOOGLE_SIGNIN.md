# Google ile giriş — kurulum

Yerel (native) akış: Google'dan bir OIDC `id_token` alınıp Supabase'e veriliyor,
Supabase token'ı Google'ın anahtarlarıyla doğrulayıp oturum açıyor. Tarayıcı ya
da redirect adresi yok — App Links / Gmail tarayıcısı sorunları bu akışı hiç
ilgilendirmiyor.

Uygulama tarafı hazır: `src/core/googleAuth.ts`, `src/components/GoogleSignInButton.tsx`.
Düğme yalnızca `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` doluyken çiziliyor, yani
aşağıdaki adımlar bitmeden kullanıcıya çalışmayan bir düğme görünmüyor.

---

## ⛔ ÖNCE BUNU OKU — "Confirm email" kapalıyken YAYINLAMA

**Durum: Supabase'de "Confirm email" KAPALI ve bu, Google girişiyle birlikte
hesap ele geçirmeye açık kapı bırakıyor.** Google düğmesi yayına çıkmadan önce
açılmalı.

### Saldırı

1. Saldırgan, kurbanın Gmail adresini biliyor: `kurban@gmail.com`.
2. Uygulamada o adresle **kendi parolasıyla** kayıt oluyor. "Confirm email"
   kapalı olduğu için hesap anında açılıyor ve Supabase e-postayı **doğrulanmış
   olarak damgalıyor** — kimse hiçbir bağlantıya tıklamadan.
3. Gerçek sahibi bir süre sonra "Google ile devam et" diyor.
4. Supabase **otomatik kimlik bağlama** yapıyor: aynı e-postaya sahip mevcut
   kullanıcıyı bulup Google kimliğini ona ekliyor.
5. Sonuç: iki kimlik tek hesapta. **Saldırganın parolası kurbanın hesabını
   açmaya devam ediyor** — kurbanın listeleri, geçmişi, Pro aboneliği dahil.

Supabase'in kendi dokümanı bu saldırıyı adıyla anıyor
([Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)):

> It would also be an insecure practice to automatically link an identity to a
> user with an unverified email address since that could lead to **pre-account
> takeover attacks**. To prevent this from happening, when a new identity can be
> linked to an existing user, Supabase Auth will remove any other **unconfirmed**
> identities linked to an existing user.

Yani Supabase'in koruması "doğrulanmamış kimliği sil" kuralı. Koruma tamamen
`email_confirmed_at`'in bir anlam taşımasına bağlı — "Confirm email" kapalıyken
o alan herkes için dolu olduğundan **koruma hiç devreye girmiyor**.

### Bu projede doğrulandı

`auth.users` tablosundaki 13 kullanıcının **13'ünde de** `email_confirmed_at`
dolu; aralarında kimsenin doğrulamadığı `test@gmail.com`, `test2@gmail.com`,
`test7@gmail.com`, `test123@gmail.com` gibi adresler var. Hiçbiri bağlantıya
tıklamadı — damgayı Supabase otomatik attı.

Bugün itibarıyla `auth.identities` içinde **yalnızca `email` sağlayıcısı** var,
tek bir `google` kimliği bile yok. Yani açık henüz kullanılmadı: Google düğmesi
yayına çıkana kadar risk penceresi açılmıyor.

### Çözüm

**Supabase → Authentication → Sign In / Providers → Email → "Confirm email" AÇ.**

Açıldıktan sonra akış şöyle oluyor:

1. Saldırgan `kurban@gmail.com` ile kayıt olur → kimlik **doğrulanmamış** kalır.
2. Kurban Google ile girer → Supabase doğrulanmamış kimliği **siler** ve Google'ı
   bağlar.
3. Saldırganın parolası artık hiçbir şeyi açmaz. Hesap sahibinde kalır. ✅

Uygulama kodu bunun ikisiyle de çalışıyor; "Confirm email" açılınca `signUp`
oturum döndürmeyi bırakıyor ve kullanıcı zaten var olan "E-postanı Kontrol Et"
ekranında kalıyor (`RegisterScreen` → `EmailVerificationScreen`). Ek bir
değişiklik gerekmiyor.

### Mevcut kayıtlar için ek adım

Ayarı açmak **geriye dönük çalışmaz**: şu an damgalı olan 13 satır damgalı
kalır. Bu adreslerden biri gerçekte başkasına aitse o squat ayakta kalır.
Yayından önce test hesaplarını temizle:

```sql
-- Once bak: hangi gercek adresler senin test hesabin olarak duruyor?
select id, email, created_at
from auth.users
order by created_at;

-- Kullanilmayan test hesaplarini sil (ornek — listeyi kendin dogrula).
-- test@gmail.com, test2@gmail.com gibi adresler GERCEK Gmail hesaplari:
-- sahipleri bir gun Google ile girerse senin acdigin satira baglanirlar.
delete from auth.users
where email in ('test@gmail.com', 'test2@gmail.com', 'test7@gmail.com',
                'test123@gmail.com', 'testuser@example.com',
                'testuser2@example.com', 'newuser12345@example.com',
                'explorer_unique_123@test.com');
```

Yayına çıktıktan sonra bağlanmanın gerçekleşip gerçekleşmediğini görmek için:

```sql
-- Hem parola hem Google kimligi olan hesaplar. Mesru olabilir (ayni kisi
-- once parolayla kaydolup sonra Google'a gecmistir) ama "Confirm email"
-- kapaliyken olusanlar supheli.
select u.email,
       min(i.created_at) filter (where i.provider = 'email')  as email_identity,
       min(i.created_at) filter (where i.provider = 'google') as google_identity
from auth.identities i
join auth.users u on u.id = i.user_id
group by u.email
having count(distinct i.provider) > 1
order by 3;
```

---

## 1. Google Cloud Console — OAuth istemcileri

https://console.cloud.google.com → proje seç (yoksa oluştur) →
**APIs & Services → OAuth consent screen** önce doldurulmalı, sonra
**Credentials**.

### 1a. OAuth consent screen

- **User type: External**, **Publishing status: In production** (Testing'de
  kalırsa yalnızca eklediğin test kullanıcıları giriş yapabilir).
- Uygulama adı, destek e-postası, geliştirici e-postası.
- **Scopes: yalnızca `email`, `profile`, `openid`.** Bunlar "non-sensitive"
  kapsamlar, Google doğrulaması (verification) gerektirmiyor. Fazlası istenirse
  yayın öncesi inceleme süreci başlar — ihtiyacımız yok.

### 1b. Android istemcisi

**Credentials → Create Credentials → OAuth client ID → Application type: Android**

| Alan | Değer |
|---|---|
| Package name | `com.pickforme.app` |
| SHA-1 certificate fingerprint | aşağıdaki **iki** parmak izinin **her biri için ayrı istemci** |

İki ayrı Android istemcisi oluşturulmalı, çünkü iki farklı anahtarla imzalanmış
derleme var — aynısı App Links'te de yapılmıştı (`store/APP_LINKS.md`):

1. **Play App Signing sertifikası** — Play'den inen sürüm. Play Console →
   **Test and release → Setup → App integrity → App signing** →
   *App signing key certificate* → **SHA-1**.
   Bu eksikse yayındaki uygulamada Google girişi çalışmaz.
2. **EAS upload/yükleme anahtarı** — doğrudan kurulan APK'lar (preview profili).
   ```bash
   npx eas credentials --platform android
   ```
   → production profilini seç → *Keystore: Manage everything* → **SHA-1**.

> ⚠ Buradaki **SHA-1**, App Links'in istediği **SHA-256** ile aynı şey değil.
> Aynı ekranda ikisi de listeleniyor; Google girişi SHA-1 istiyor.

Android istemcisinin **ID'si hiçbir yere girilmiyor**. Tek işi, isteğin doğru
imzalanmış uygulamadan geldiğini Google'a doğrulatmak.

### 1c. Web istemcisi — uygulamaya girilecek olan bu

**Create Credentials → OAuth client ID → Application type: Web application**

- Ad: serbest (ör. "Pick For Me — Supabase").
- **Authorized redirect URIs**:
  ```
  https://hyponiakuodmrvwuocrp.supabase.co/auth/v1/callback
  ```
- Oluşunca **Client ID** ve **Client secret** çıkacak. İkisini de sakla.

Neden web istemcisi: yerel akışta Google'ın döndürdüğü `id_token`'ın `aud`
alanında **web istemcisinin ID'si** yazıyor, Supabase de token'ı ona karşı
doğruluyor.

---

## 2. Supabase

**Authentication → Sign In / Providers → Google → Enable**

| Alan | Değer |
|---|---|
| Client IDs | 1c'deki **Web** client ID |
| Client Secret | 1c'deki **Web** client secret |
| Skip nonce check | **kapalı bırak** |

> Nonce hakkında: `@react-native-google-signin`'in klasik `signIn()` akışında
> Google `nonce` iddiası olmayan bir token veriyor, dolayısıyla Supabase nonce
> aramıyor ve bu ayara dokunmaya gerek yok. Açmak gereksiz yere doğrulamayı
> gevşetir.

Aynı ekranda, yukarıda anlatılan sebeple:

**Authentication → Sign In / Providers → Email → "Confirm email" AÇ.**

---

## 3. Uygulama

`.env` dosyasına **web** client ID'sini yaz:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

EAS derlemeleri `.env`'i okumuyor; değişkeni ortama da ekle:

```bash
npx eas env:create --environment production \
  --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID \
  --value "1234567890-abc123.apps.googleusercontent.com" \
  --visibility plaintext --scope project
```

(`closed-test` profili `production` ortamını kullanıyor, ayrıca eklemeye gerek
yok. Bu değer gizli değil — istemci tarafında zaten görünür.)

Yerel modül eklendi, **yeni derleme şart**; OTA yetmez.

---

## 4. Doğrulama

```bash
# Imza parmak izi Google'daki ile ayni mi?
npx eas credentials --platform android

# Kurulu derlemede dene: hesap secici aciliyor mu, giris sonrasi ana ekran geliyor mu
```

Yeni bir Google kullanıcısı girdikten sonra:

```sql
select u.email, i.provider, u.raw_app_meta_data->'providers' as providers
from auth.identities i join auth.users u on u.id = i.user_id
where i.provider = 'google';
```

Sık karşılaşılan hatalar:

| Belirti | Sebep |
|---|---|
| Hesap seçici açılıyor, `idToken` boş geliyor | `webClientId` yanlış ya da Web istemcisi değil |
| `DEVELOPER_ERROR` / seçici hemen kapanıyor | SHA-1 eksik/yanlış ya da paket adı uyuşmuyor |
| Supabase "Invalid token" diyor | Supabase'e Web yerine Android client ID girilmiş |
| Play sürümünde çalışmıyor, APK'da çalışıyor | Play App Signing SHA-1'i eklenmemiş |

---

## 5. Play Data Safety — güncelleme GEREKİYOR

Google girişi, e-postaya ek olarak **ad** ve **profil fotoğrafı URL'si**
getiriyor; Supabase bunları `auth.users.raw_user_meta_data` içine yazıyor. Yani
daha önce beyan edilmemişse toplanan veri kümesi büyüyor.

**App content → Data safety** altında *Personal info* için:

| Veri tipi | Durum | Not |
|---|---|---|
| Email address | zaten toplanıyordu | Collected ✓, hesap yönetimi amacıyla |
| Name | **YENİ — eklenmeli** | Google profilinden geliyor |
| User IDs | **YENİ — eklenmeli** | Google hesap kimliği + Supabase uuid |
| Photos | **YENİ — eklenmeli** | Profil fotoğrafı URL'si |

Her biri için: **Collected: Yes**, **Shared: No** (veri yalnızca kendi
Supabase projemize gidiyor), amaç *Account management* (+ *App functionality*).
"Users can request that their data be deleted" zaten işaretli olmalı — hesap
silme akışı mevcut (`docs/account-deletion.html`).

Fotoğrafı beyan etmek istemiyorsan tek yol onu hiç saklamamak; şu anki akışta
Supabase metadata'ya kendisi yazdığı için beyan etmek daha doğru.

İzin tarafında değişiklik yok: Google girişi hassas izin istemiyor, ayrı bir
beyan formu gerekmiyor.
