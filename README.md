# Pick For Me

A decision-making mobile app built with Expo / React Native (TypeScript, SDK 54).  
Can't decide? Let the app decide for you.

## Tools

| Tool | Description |
|------|-------------|
| Wheel of Fortune | Spin to pick from custom options |
| Dice | Roll 1–2 dice with 4/6/8/10/12/20 sides |
| Coin Flip | Heads or tails (rare edge included) |
| Color Picker | Pick a random color with palette |
| Idea Generator | Random creative ideas |
| Quick Challenge | Random daily challenges |
| Movie Picker | Random movie suggestion |

## Getting Started

**Prerequisites:** Node.js LTS, Git, Expo account (optional)

```bash
npm install
npx expo start
```

Open with [Expo Go](https://expo.dev/go) on your phone, or press `a` (Android) / `i` (iOS simulator).

## Demo Mode

The app works fully offline **without a Supabase account**. When `.env` has no Supabase credentials (or the file doesn't exist), the app runs in demo mode:

- Auth is skipped — you land directly on the home screen
- All tools work normally
- History is stored locally (AsyncStorage, last 48 hours)
- Settings and language switching work normally

## Supabase Setup (optional)

To enable real authentication, create a project at [supabase.com](https://supabase.com), then:

```bash
cp .env.example .env
```

Fill in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server after changing `.env`.

### Account deletion (Edge Function)

Google Play requires an in-app account deletion flow. Deleting the auth user
needs the service-role key, so it runs in a Supabase Edge Function
(`supabase/functions/delete-account/index.ts`). Deploy it once per project:

```bash
npm i -g supabase              # Supabase CLI (or: npx supabase ...)
supabase login
supabase link --project-ref <your-project-ref>   # ref from the dashboard URL
supabase functions deploy delete-account
```

No extra secrets needed — `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are provided automatically in the Edge runtime.

If the function is unreachable, the app falls back to deleting the user's
cloud rows (`saved_lists`, `activity_history`), signing out, and showing a
"deletion request received" message. The web request page for Play Console is
`store/account-deletion.html` (host it and enter its URL under
**Play Console → App content → Data safety → Account deletion**).

## Ads (AdMob)

Ad **unit** IDs are read from env (`EXPO_PUBLIC_ADMOB_BANNER_ANDROID/_IOS`,
`..._INTERSTITIAL_...`, `..._REWARDED_...` — see `.env.example`). Dev builds
(`__DEV__`) always use Google's test IDs; in production a missing env value
disables that ad format with a console warning.

> **⚠️ Before release:** the AdMob **App IDs** in `app.json`
> (`plugins → react-native-google-mobile-ads → androidAppId / iosAppId`) are
> still Google's sample IDs (`ca-app-pub-3940256099942544~…`). Replace them
> with your real App IDs from the AdMob console and rebuild — App IDs are
> baked into the native build and cannot come from env at runtime. Also set
> the 6 `EXPO_PUBLIC_ADMOB_*` unit IDs in the EAS build environment.

## Project Structure

```
src/
├── components/       # Reusable UI components (GlassCard, ModernButton, DiceFace)
├── core/
│   ├── PickEngine.ts # All randomization logic (spin, roll, flip, color, …)
│   └── Theme.ts      # Colors, spacing, border-radius tokens
├── i18n/             # Translations (Turkish / English via i18next)
├── navigation/       # Stack + bottom-tab navigator wiring
├── screens/
│   ├── auth/         # LoginScreen, RegisterScreen
│   ├── main/         # HomeScreen, ResultScreen, SettingsScreen
│   └── tools/        # One screen per tool
└── storage/
    ├── local.ts      # AsyncStorage wrapper
    └── supabase.ts   # Supabase client + demo-mode mock
```

## Stack

- **React Native 0.81** · **Expo SDK 54** · **TypeScript** (strict mode)
- **React Navigation** (native stack + bottom tabs)
- **i18next** — Turkish and English
- **Supabase** — auth (optional; demo mode when unconfigured)
- **AsyncStorage + SecureStore** — local persistence
- **react-native-reanimated** · **react-native-svg** · **expo-haptics**

## Language

The app detects device locale on first launch (Turkish or English). Language can be toggled any time in Settings.

## Development Notes

> **⚠️ Before release:** `PRIVACY_URL` and `TERMS_URL` at the top of
> `src/screens/main/PaywallScreen.tsx` point to placeholder pages
> (`https://pickforme.app/privacy` / `/terms`). Replace them with the real,
> hosted URLs — both stores require working links on the paywall.

- Run `npx tsc --noEmit` before committing — must pass clean.
- Run `npx expo-doctor` to catch SDK/package mismatches.
- Each development phase lives on its own branch (`feat/fazN`).
- Tools follow this touch order when adding a new one:  
  `PickEngine` → screen (`src/screens/tools/`) → `navigation/index.tsx` → `HomeScreen` TOOLS array → `i18n/locales/{tr,en}.json`
