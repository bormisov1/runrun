# RUNRUN Google Play release

The Android package is `com.bormisov.runrun`. The production EAS profile builds an
Android App Bundle (AAB) and increments `versionCode` remotely. Submission targets
the internal testing track.

## Assets in this directory

- `play-icon-512.png`: Play listing icon.
- `feature-graphic-1024x500.png`: feature graphic.
- `screenshot-01-dashboard.png`, `screenshot-02-history.png`, and
  `screenshot-03-awards.png`: 824 × 1830 captures of the real web app at a phone
  viewport. A synthetic sample run was stored locally in the browser for these
  captures. Verify the screens against a production Android build before upload.

Run `node scripts/render-icon.mjs` after changing the logo to regenerate the icon,
splash image, adaptive icon layers, and store graphics. Recheck screenshots after
any app UI changes.

## Play Console setup

1. Create the app in Play Console with package name `com.bormisov.runrun`.
2. Publish `public/privacy.html` at a stable public HTTPS URL and enter that URL
   in Play Console. Confirm the contact link and policy still match the app.
3. Complete the app content and Data safety forms based on the actual release.
   RUNRUN has no account or developer server; location and run history remain on
   device. User-chosen exports go to the destination they select.
4. Declare background location. It records a route during an active run while
   the app is closed or the screen is locked. Show Play the in-app disclosure
   displayed before the location permission request, and provide a short demo
   video of starting and finishing a background run.
5. Upload the icon, feature graphic, and at least two screenshots. Review the
   listing on a real device. Provide release notes and complete the content rating
   and target audience questionnaires.
6. For automated upload, place the Google Play service account JSON at
   `play-store/service-account.json` in the repo root. This path is git-ignored.
   Give that account the required Play Console release permission.

## Build and submit

```sh
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

If the service account is unavailable, download the AAB from the EAS build page
and upload it manually to Internal testing. Test background GPS, camera/video
saving, route exports, and permission denial on an Android device before promoting
the release. Browser captures do not verify native Android behavior.

Relevant references: [Expo EAS configuration](https://docs.expo.dev/eas/json/),
[Play listing asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151),
[background location policy](https://support.google.com/googleplay/android-developer/answer/9799150),
and [privacy policy requirements](https://support.google.com/googleplay/android-developer/answer/9859455).
