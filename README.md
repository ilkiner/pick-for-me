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
