import { readFileSync, writeFileSync } from 'node:fs';

// Expo Camera 57 configures AVCaptureSession's audio session itself. Apple
// provides this switch so external music can continue during video capture.
const path = 'node_modules/expo-camera/ios/Current/CameraSessionManager.swift';
const original = `  init(delegate: CameraSessionManagerDelegate) {
    self.delegate = delegate
    super.init()
    deviceDiscovery.delegate = self
  }`;
const patched = `  init(delegate: CameraSessionManagerDelegate) {
    self.delegate = delegate
    super.init()
    session.configuresApplicationAudioSessionToMixWithOthers = true
    deviceDiscovery.delegate = self
  }`;

const source = readFileSync(path, 'utf8');
if (source.includes(patched)) process.exit(0);
if (!source.includes(original)) throw new Error('Expo Camera audio session source changed; review the mixing patch.');
writeFileSync(path, source.replace(original, patched));
