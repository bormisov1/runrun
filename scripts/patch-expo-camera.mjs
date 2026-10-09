import { readFileSync, writeFileSync } from 'node:fs';

// Expo Camera 57 configures AVCaptureSession's audio session itself. Apple
// provides this switch so external music can continue during video capture.
function patch(path, original, replacement) {
  const source = readFileSync(path, 'utf8');
  if (source.includes(replacement)) return;
  if (!source.includes(original)) throw new Error(`${path} changed; review the camera patch.`);
  writeFileSync(path, source.replace(original, replacement));
}

const sessionPath = 'node_modules/expo-camera/ios/Current/CameraSessionManager.swift';
const sessionOriginal = `  init(delegate: CameraSessionManagerDelegate) {
    self.delegate = delegate
    super.init()
    deviceDiscovery.delegate = self
  }`;
const sessionPatched = `  init(delegate: CameraSessionManagerDelegate) {
    self.delegate = delegate
    super.init()
    session.configuresApplicationAudioSessionToMixWithOthers = true
    deviceDiscovery.delegate = self
  }`;
patch(sessionPath, sessionOriginal, sessionPatched);

// Expo's lifecycle adapter calls onAppBackgrounded on WillResignActive, which
// also fires for Control Center. Keep recording through that transient state.
const viewPath = 'node_modules/expo-camera/ios/Current/CameraView.swift';
const viewOriginal = `  public func onAppBackgrounded() {
    sessionQueue.async { [weak self] in
      guard let self else {
        return
      }
      if session.isRunning && !isSessionPaused {
        isSessionPaused = true
        session.stopRunning()
      }
    }
  }`;
const viewPatched = `  public func onAppBackgrounded() {
    // Control Center makes the app inactive without putting it in the background.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let self, UIApplication.shared.applicationState == .background else {
        return
      }
      self.sessionQueue.async { [weak self] in
        guard let self else { return }
        if session.isRunning && !isSessionPaused {
          isSessionPaused = true
          session.stopRunning()
        }
      }
    }
  }`;
patch(viewPath, viewOriginal, viewPatched);
