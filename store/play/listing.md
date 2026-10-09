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
> RUNRUN collects location data to record your route, distance and speed during
> an active run, even when the app is closed or not in use, if you choose
> background tracking. You can choose tracking only while RUNRUN is open.
> Tracking stops when you finish or discard the run.
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

**Background location feature:** Recording a user-started run while the app is
closed or the phone is locked. RUNRUN records GPS points during that active run
to calculate and display the route, distance and speed. The user can stop or
discard the run, and can choose foreground-only recording. Routes stay on the
device unless the user explicitly exports them.

**Location foreground service:** Keeps the user-started run recording and its
persistent recording notification active while the user uses other apps or locks
the screen. If delayed or interrupted, route points may be missing and distance
and pace may become inaccurate.

Google requires a short **Android device recording** showing Start Run, the
in-app location disclosure, the runtime permission flow, a run continuing with
the app in the background, and Stop Run. Supply that video in the location and
foreground-service declarations when Play Console requests it.
