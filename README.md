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
`store/account-deletion.html`, hosted at
`https://ilkiner.github.io/pick-for-me/account-deletion.html` (entered under
**Play Console → App content → Data safety → Account deletion**).

## Ads (AdMob)

Ad **unit** IDs are read from env (`EXPO_PUBLIC_ADMOB_BANNER_ANDROID/_IOS`,
`..._INTERSTITIAL_...`, `..._REWARDED_...` — see `.env.example`). Dev builds
(`__DEV__`) always use Google's test IDs; in production a missing env value
disables that ad format with a console warning.

The production AdMob **App IDs** are set in `app.json`
(`plugins → react-native-google-mobile-ads → androidAppId / iosAppId`). They are
baked into the native build and cannot come from env at runtime, so changing
them requires a rebuild.

> **⚠️ Before release:** make sure the 6 `EXPO_PUBLIC_ADMOB_*` unit IDs are set
> in the EAS build environment — `.env` is not uploaded with the build.

## Building & Submitting (EAS)

Build profiles live in `eas.json` (`development` / `preview` / `production`).
`appVersionSource` is `remote`, so EAS owns `versionCode` / `buildNumber` for
production builds — the values in `app.json` are not what ships.

```bash
eas build --profile production --platform android
eas submit --profile production --platform android
```

**iOS submit credentials are intentionally left empty** in
`eas.json` (`submit.production.ios`). Fill `appleId`, `ascAppId` and
`appleTeamId` at submit time — either by letting `eas submit` prompt for them
interactively, or by passing them via EAS secrets / CLI flags. They are kept
out of the repo on purpose so no Apple account identifiers are committed.

```bash
eas submit --profile production --platform ios   # prompts for the three values
```

Ad unit IDs and other `EXPO_PUBLIC_*` values must be set in the EAS build
environment (project secrets), since `.env` is not uploaded with the build.

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

- Run `npx tsc --noEmit` before committing — must pass clean.
- Run `npx expo-doctor` to catch SDK/package mismatches.
- Each development phase lives on its own branch (`feat/fazN`).
- Tools follow this touch order when adding a new one:  
  `PickEngine` → screen (`src/screens/tools/`) → `navigation/index.tsx` → `HomeScreen` TOOLS array → `i18n/locales/{tr,en}.json`
