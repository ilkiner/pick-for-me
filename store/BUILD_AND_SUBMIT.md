# Build & Submit Guide — Pick For Me

## Prerequisites
- Expo account: expo.dev (free)
- Google Play Console: play.google.com/console ($25 one-time)
- Apple Developer Program: developer.apple.com ($99/year) — iOS only
- RevenueCat account: app.revenuecat.com (free tier fine)
- Google AdMob account: admob.google.com (free)

---

## Step 0 — Fill environment variables

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
EXPO_PUBLIC_REVENUECAT_KEY_IOS=appl_xxxx
EXPO_PUBLIC_REVENUECAT_KEY_ANDROID=goog_xxxx
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-xxxx/xxxx
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-xxxx/xxxx
EXPO_PUBLIC_ADMOB_REWARDED_ANDROID=ca-app-pub-xxxx/xxxx
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-xxxx/xxxx
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-xxxx/xxxx
EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-xxxx/xxxx
```

See `.env.example` for the full list. `.env` only covers local dev — EAS builds
read their own env (Step 1).

---

## Step 1 — Push AdMob ad unit IDs to EAS

✅ **Done already:** the production AdMob **App IDs** live in `app.json`
(`plugins → react-native-google-mobile-ads`). They are baked into the native
build, so changing them needs a rebuild — not a config change.

The **ad unit** IDs come from env at build time (`src/core/AdManager.ts` reads
them; no hardcoded IDs to edit). `.env` is gitignored and is *not* uploaded with
an EAS build, so the six values must be registered with EAS:

```bash
eas env:create --environment production --name EXPO_PUBLIC_ADMOB_BANNER_ANDROID       --value ca-app-pub-…/…
eas env:create --environment production --name EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID --value ca-app-pub-…/…
eas env:create --environment production --name EXPO_PUBLIC_ADMOB_REWARDED_ANDROID     --value ca-app-pub-…/…
eas env:create --environment production --name EXPO_PUBLIC_ADMOB_BANNER_IOS           --value ca-app-pub-…/…
eas env:create --environment production --name EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS     --value ca-app-pub-…/…
eas env:create --environment production --name EXPO_PUBLIC_ADMOB_REWARDED_IOS         --value ca-app-pub-…/…
```

(On older EAS CLI versions this is `eas secret:create --scope project --name … --value …`.)
Copy the values from your local `.env`. Use visibility `plaintext` — `EXPO_PUBLIC_*`
vars are inlined into the JS bundle regardless, and ad unit IDs are not secrets.

Verify with `eas env:list --environment production` before building. A missing
value does **not** fail the build: that ad format is silently disabled in
production with a console warning.

`__DEV__` builds always use Google's test IDs, so dev builds need none of this.

---

## Step 2 — EAS CLI setup (one-time)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

`eas build:configure` will:
- Create an EAS project linked to your Expo account
- Generate Android signing credentials (or import your own)
- Generate iOS distribution certificate & provisioning profile

---

## Step 3 — Development build (for testing RevenueCat + AdMob)

```bash
# Android (APK, installs directly)
eas build --platform android --profile development

# iOS (requires Apple Developer account)
eas build --platform ios --profile development
```

Install the dev build on a physical device to test:
- RevenueCat purchases (use sandbox)
- AdMob ads
- Supabase auth flow
- Deep links (pickforme://)

---

## Step 4 — Which profile builds what

| Goal | Profile | Ads served |
|---|---|---|
| Dev client on your own device | `development` | Google test units (`__DEV__`) |
| Internal APK passed around by hand | `preview` | Google test units (preview env sets the flag) |
| **Play Internal / Closed test AAB** | **`closed-test`** | **Google test units** |
| Public release (production track) | `production` | **Real** ad units |

`closed-test` extends `production`, so it is the *same* build in every other
respect — production environment, production Supabase/RevenueCat/Sentry keys,
same signing, `autoIncrement` version code. The only difference is
`EXPO_PUBLIC_ADMOB_FORCE_TEST_UNITS=true`, set in `eas.json` on the profile.

> **Why not an EAS environment variable?** A Play Closed test AAB runs in the
> `production` *environment* — that is the point of closed testing. So preview vs.
> production cannot tell a tester build from a release build; only the build
> profile can. The flag lives in `eas.json` where it is committed and reviewable,
> and `production` pins it to `"false"` so the release build can never inherit it.

```bash
# Tester AAB — Internal test / Closed test tracks
eas build --platform android --profile closed-test

# Release AAB — production track
eas build --platform android --profile production

# iOS
eas build --platform ios --profile closed-test   # TestFlight testers
eas build --platform ios --profile production    # App Store release
```

**Verify before handing an AAB to testers:** install it and confirm the ads are
labelled *"Test Ad"* by Google. The build log also prints
`[Ads] Forced test units — Google universal test ad units in use.` If you instead
see `[Ads] Live ad mode`, stop — that build serves real ads and tester taps will
be counted as invalid traffic.

Also confirm the flag was never pushed to the EAS production environment, which
would defeat the pinning above:

```bash
eas env:list --environment production   # EXPO_PUBLIC_ADMOB_FORCE_TEST_UNITS must be absent
```

---

## Step 5 — iOS 26 SDK Compatibility Check

Expo SDK 54 ships with React Native 0.81.5 and targets iOS 16.0+.
Apple requires iOS 17+ minimum from **Spring 2026** onward.

✅ Expo SDK 54 satisfies Apple's new minimum deployment target.
✅ Privacy manifest (`PrivacyInfo.xcprivacy`) — Expo generates this automatically.
✅ Required reason API declarations — included by Expo and AdMob plugin.

If the build is rejected for SDK version, upgrade: `npx expo install expo@~55.0.0`
(SDK 55 will target iOS 18+ — check expo.dev/changelog before upgrading).

---

## Step 6 — Google Play: Internal Test

1. Log in to play.google.com/console
2. Create new app → "Pick For Me" → Free → App → Personal/Not registered business
3. Complete the "Setup" checklist on the left sidebar:
   - App access: all functionality available
   - Ads: Yes, contains ads (AdMob)
   - Content rating: Complete the questionnaire → Everyone
   - Target audience: 13+
   - News app: No
   - COVID-19: No
   - Data safety form (see section below)
   - Privacy policy: https://ilkiner.github.io/pick-for-me/privacy-policy.html

4. Upload AAB — build it with `--profile closed-test` (Step 4), never `production`:
   - Release → Internal testing → Create release → Upload AAB
   - Release notes (EN): "Initial release — all tools, Pro subscription"
   - Release notes (TR): "İlk sürüm — tüm araçlar, Pro aboneliği"

5. Add testers (Internal test):
   - Add your Gmail and up to 100 tester emails
   - Share the opt-in link with testers

---

## Step 7 — Play Store Data Safety Form

| Data type | Collected? | Shared? | Optional? |
|---|---|---|---|
| Email address | Yes | No | No — required for sign-in |
| App activity | Yes | No | — crash/usage analytics |
| App info and performance | Yes | No | — crash reports |
| Advertising ID | Yes (free users) | Yes → Google AdMob | No |
| Financial info | No | — | — (RevenueCat never gives us card data) |

Notes:
- Data is encrypted in transit (HTTPS/TLS)
- Users can request deletion (email pickforme.app@gmail.com)
- No data collected from children under 13

---

## Step 8 — EAS Submit (automated upload)

After the build completes:
```bash
# Android — uploads to internal test track
eas submit --platform android --profile production --latest

# iOS — uploads to TestFlight
eas submit --platform ios --profile production --latest
```

`--profile` here names a **submit** profile (`submit.production` in `eas.json`),
which is a different namespace from the build profiles in Step 4 — there is only
one submit profile and it is used for tester and release uploads alike. It targets
the `internal` track; for the Closed testing track add `--track alpha` (or your
custom closed track's name). `--latest` picks the most recent build, so make sure
that build came from the profile you intended.

For Android automated submit, create a service account:
- play.google.com/console → Setup → API access → Link to Google Cloud
- Create service account with "Release Manager" role
- Download JSON key → save as `google-service-account.json`

> **🔑 Keep it out of git.** `.gitignore` covers that **exact filename**, plus
> `*.p8` / `*.p12` / `*.keystore` / `*.jks` for signing material. Rename the file
> and it is no longer ignored — so keep the name, or add the new one to
> `.gitignore` first. This key has "Release Manager" rights on the Play listing;
> if it ever lands in a commit, revoke it in Google Cloud and issue a new one —
> deleting the file in a later commit does not remove it from history.

---

## Step 9 — Closed → Production rollout

Internal test → Closed testing (20-100 external testers) → Staged rollout (10% → 50% → 100%)

Internal and Closed test both ship the `closed-test` AAB. The production track is
the one and only place the `production` AAB goes — **rebuild with
`--profile production`** before promoting, do not promote the tester AAB. A
`closed-test` build on the production track would show every real user a Google
test ad and earn nothing.

Typical timeline: 1-3 days review for Android, 1-7 days for iOS.

---

## Checklist before production release

- [ ] `.env` filled with production keys
- [x] AdMob App IDs in `app.json` are the real ones (no longer Google's samples)
- [ ] AdMob ad unit IDs registered as EAS env vars for the `production` environment
- [ ] RevenueCat products created in App Store Connect + Play Console
- [ ] Privacy policy hosted at https://ilkiner.github.io/pick-for-me/privacy-policy.html
- [ ] Data safety form completed
- [ ] Screenshots added (min 2 phone screenshots)
- [ ] Store description added (EN + TR)
- [ ] Content rating completed
- [ ] Internal test APK/AAB installed and smoke-tested
- [ ] Tester AAB built with `--profile closed-test`, ads confirmed to read "Test Ad"
- [ ] `EXPO_PUBLIC_ADMOB_FORCE_TEST_UNITS` absent from `eas env:list --environment production`
- [ ] Release AAB rebuilt with `--profile production` (not promoted from a tester build)
- [ ] Subscription sandbox tested on physical device
- [ ] Deep links tested (pickforme://reset-password, pickforme://verify-email)
