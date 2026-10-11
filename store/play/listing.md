# RUNRUN listing text for Play Console

## Create app

- App name: `RUNRUN`
- Default language: English (United States)
- Type: App
- Pricing: Free
- Category: Health & Fitness
- Support email: `expo@bormisov.com`
- Privacy policy: <https://bormisov.com/runrun/privacy.html>
- Account or login required: No
- Ads: No
- In-app purchases: No
- Android package in the AAB: `com.bormisov.runrun`
- Health apps declaration: Health and fitness → Activity and Fitness

Choose the target age groups and answer the content rating questionnaire according
to the intended audience. These are account-owner declarations, not app defaults.

## Main store listing

**Short description**

> Track runs, see your route and progress, and share your activity.

**Full description**

> RUNRUN helps you record each run and see how far you have come.
>
> Start a GPS run to track your route, distance, duration, speed and elevation.
> Review past runs, explore your achievements, crop a run recap, and export a
> route as a GPX file or a shareable image. You can also capture photos and
> videos during a run and save them on your device.
>
> RUNRUN records your last 24 hours of location on your device by default, so
> you can select any part of the route and create an activity later. Old points
> are deleted automatically. You can turn this off in Settings, which also
> clears recent points. Background recording requires background location
> permission; without it, recording works while the app is open.
>
> Runs and routes are stored on your device. RUNRUN requires no account and
> includes no ads. Exports are shared only when you choose a destination.

**First internal-test release notes**

> First Android test release: GPS run recording, run history, achievements,
> camera captures and route exports.

## Files to upload

- App bundle: use the latest production AAB from the RUNRUN EAS build page.
- App icon: `play-icon-512.png`.
- Feature graphic: `feature-graphic-1024x500.png`.
- Phone screenshots: `screenshot-01-dashboard.png`,
  `screenshot-02-history.png`, `screenshot-03-awards.png`.

The screenshots show a synthetic example run in the real app interface. Check
them against a native Android build before using them in a public listing.

## Permission declaration wording

**Background location feature:** Keeping a rolling 24-hour route on the device
while the app is closed or the phone is locked, so the user can select a
fragment and create an activity later. This is enabled by default and can be
turned off in Settings, which clears recent points. Saved activities remain in
run history. Routes stay on the device unless the user explicitly exports them.

**Location foreground service:** Keeps the rolling route recording and its
persistent notification active while the user uses other apps or locks the
screen. If delayed or interrupted, route points may be missing.

Google requires a short **Android device recording** showing the 24-hour
location disclosure, the runtime permission flow, recording in the background,
creating an activity from a fragment, and turning recording off in Settings. Supply that video in the location and
foreground-service declarations when Play Console requests it.

## Data safety notes

RUNRUN's own code keeps routes and run history on the device. It has no account,
developer server, analytics, or advertising SDK. Exporting a route or photo to
another app requires a specific user action. Google's Data safety definition
does not count data processed only on-device as collected, and exempts sharing
that the user specifically initiates and expects. Check the final Android bundle
and all included SDK behavior before submitting the form; the account owner is
responsible for its accuracy.
