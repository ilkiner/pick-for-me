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
```

---

## Step 1 — Replace AdMob test IDs with production IDs

In `app.json`, replace:
- `ca-app-pub-3940256099942544~3347511713` → your Android App ID
- `ca-app-pub-3940256099942544~1458002511` → your iOS App ID

In `src/core/AdManager.ts`, replace the test ad unit IDs with production IDs.

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

## Step 4 — Production build

```bash
# Android (AAB — required by Play Store)
eas build --platform android --profile production

# iOS (IPA)
eas build --platform ios --profile production
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
   - Privacy policy: https://pickforme.app/privacy

4. Upload AAB:
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

After production build completes:
```bash
# Android — uploads to internal test track
eas submit --platform android --profile production

# iOS — uploads to TestFlight
eas submit --platform ios --profile production
```

For Android automated submit, create a service account:
- play.google.com/console → Setup → API access → Link to Google Cloud
- Create service account with "Release Manager" role
- Download JSON key → save as `google-service-account.json` (gitignored)

---

## Step 9 — Closed → Production rollout

Internal test → Closed testing (20-100 external testers) → Staged rollout (10% → 50% → 100%)

Typical timeline: 1-3 days review for Android, 1-7 days for iOS.

---

## Checklist before production release

- [ ] `.env` filled with production keys
- [ ] AdMob test IDs replaced with real IDs
- [ ] RevenueCat products created in App Store Connect + Play Console
- [ ] Privacy policy hosted at https://pickforme.app/privacy
- [ ] Data safety form completed
- [ ] Screenshots added (min 2 phone screenshots)
- [ ] Store description added (EN + TR)
- [ ] Content rating completed
- [ ] Internal test APK/AAB installed and smoke-tested
- [ ] Subscription sandbox tested on physical device
- [ ] Deep links tested (pickforme://reset-password, pickforme://verify-email)
