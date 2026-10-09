# RUNRUN

Android Google Play build and submission notes: [store/play/README.md](store/play/README.md).

Dark running tracker built with Expo / React Native.

## Run locally

```sh
npm install
npx expo start --tunnel
```

Open the resulting `exp://` URL in Expo Go on an iPhone. Expo Go supports foreground GPS, run statistics, achievements, and transparent route PNG / GPX export. The native iOS build is required for branded camera exports, background tracking, and dark Apple Maps; Expo Go displays a route trace in place of the map.

## iPhone build

The iOS build enables background location while the phone is locked, dark Apple Maps, and a local Swift module that burns the same RUNRUN watermark into saved photos and videos. After a run, open its recap to trim the timeline, save a fragment, and export a transparent route PNG with stats. After the automatic TestFlight upload, add the processed build and your Apple ID to an internal TestFlight testing group in App Store Connect.

The camera records microphone audio. This implementation does not embed sound played by other apps; protected music can also be restricted by iOS capture APIs.

## Verification

```sh
npm test
npm run typecheck
npx expo-doctor
```

## GitHub Actions TestFlight builds

Pull requests to `dev` and `master` run JavaScript tests and type checking on Linux. Merges to `master` then build the iOS app once from the merge commit and upload it to TestFlight using the standard GitHub macOS runner. The release workflow also supports manual runs from the Actions tab. It does not use EAS Build or EAS Submit.

Add these repository Actions secrets before the first build: `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_API_KEY_P8` (the full contents of a dedicated App Store Connect Team API `.p8` key with access to signing and app delivery). Do not commit the key file. The workflow checks for secrets on Linux before starting a macOS job.
