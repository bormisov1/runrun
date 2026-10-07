# RUNRUN

Dark running tracker built with Expo / React Native.

## Run locally

```sh
npm install
npx expo start --tunnel
```

Open the resulting `exp://` URL in Expo Go on an iPhone. Expo Go supports foreground GPS, run statistics, achievements, branded photos, and transparent route PNG / GPX export.

## iPhone build

```sh
eas build --platform ios --profile production
eas submit --platform ios --id <finished-production-build-id>
```

The iOS build enables background location while the phone is locked and includes a local Swift module that burns the RUNRUN logo into saved camera video. After submitting, add the processed build and your Apple ID to an internal TestFlight testing group in App Store Connect. A simulator build (`eas build --platform ios --profile simulator`) checks native compilation without Apple credentials but cannot be installed on an iPhone.

The camera records microphone audio. This implementation does not embed sound played by other apps; protected music can also be restricted by iOS capture APIs.

## Verification

```sh
npm test
npm run typecheck
npx expo-doctor
```
