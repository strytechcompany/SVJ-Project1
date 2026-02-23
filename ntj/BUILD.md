# EAS Build – Android (APK / AAB)

Builds run in the cloud with [EAS Build](https://docs.expo.dev/build/introduction/). Use these from the **ntj** folder.

## Prerequisites

1. **Expo account** – [expo.dev](https://expo.dev) (free tier is enough).
2. **Login** (once):
   ```bash
   npx eas login
   ```
3. **Configure the project** (once):
   ```bash
   npx eas build:configure
   ```
   This uses the existing `eas.json`; you can accept the defaults.

## Build commands

| Use case | Command | Output |
|----------|---------|--------|
| **Testing** (internal testers, QA) | `npm run build:testing` | **APK** – install via download link |
| **Release** (clients / stakeholders) | `npm run build:release` | **APK** – install via download link |
| **Production** (Play Store) | `npm run build:production` | **AAB** – upload to Google Play Console |

Or run EAS directly:

```bash
# Testing APK
eas build --platform android --profile testing

# Release APK for clients
eas build --platform android --profile release

# Production AAB for Play Store
eas build --platform android --profile production
```

## After the build

- **Testing / Release (APK):** EAS gives you a link to download the APK. Share the link; testers install the APK on their devices.
- **Production (AAB):** Download the `.aab` from the EAS build page and upload it in [Google Play Console](https://play.google.com/console) (Release → Production or testing track).

## Optional: change Android package name

If you want a different package (e.g. `com.yourcompany.ntj`), edit `app.json`:

```json
"android": {
  "package": "com.yourcompany.ntj",
  ...
}
```

## Optional: submit to Play Store from CLI

To use `eas submit` for production, add a [Google Play service account](https://docs.expo.dev/submit/android/#credentials) and put the key at `./google-service-account.json`. The `eas.json` submit section is already set up for that path.
