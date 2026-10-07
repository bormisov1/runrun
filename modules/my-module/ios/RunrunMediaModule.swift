import ExpoModulesCore
import AVFoundation
import UIKit

public class RunrunMediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RunrunMedia")

    AsyncFunction("brandPhoto") { (uri: String, promise: Promise) in
      guard let input = URL(string: uri), input.isFileURL,
            let image = UIImage(contentsOfFile: input.path) else {
        promise.reject("E_INPUT", "A local photo file is required")
        return
      }
      let scale = image.scale
      let format = UIGraphicsImageRendererFormat()
      format.scale = scale
      format.opaque = true
      let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
      let branded = renderer.image { _ in
        image.draw(in: CGRect(origin: .zero, size: image.size))
        let unit = max(1, min(image.size.width, image.size.height) / 600)
        let inset = 20 * unit
        let height = 46 * unit
        let width = 205 * unit
        let box = CGRect(x: inset, y: image.size.height - inset - height, width: width, height: height)
        UIColor.black.withAlphaComponent(0.6).setFill()
        UIBezierPath(roundedRect: box, cornerRadius: 7 * unit).fill()
        let text = NSAttributedString(string: "RUNRUN.", attributes: [
          .font: UIFont.systemFont(ofSize: 30 * unit, weight: .black).withTraits(.traitItalic),
          .foregroundColor: UIColor.white,
          .kern: -1.5 * unit
        ])
        text.draw(at: CGPoint(x: box.minX + 10 * unit, y: box.minY + 4 * unit))
      }
      guard let data = branded.jpegData(compressionQuality: 0.95) else {
        promise.reject("E_EXPORT", "Could not render branded photo")
        return
      }
      let output = FileManager.default.temporaryDirectory.appendingPathComponent("runrun-\(UUID().uuidString).jpg")
      do {
        try data.write(to: output)
        promise.resolve(output.absoluteString)
      } catch {
        promise.reject("E_EXPORT", error.localizedDescription)
      }
    }

    AsyncFunction("focusCamera") { (x: Double, y: Double, promise: Promise) in
      DispatchQueue.main.async {
        guard let (layer, device) = self.activeCamera() else {
          promise.reject("E_CAMERA", "Camera preview is unavailable")
          return
        }
        let point = layer.captureDevicePointConverted(fromLayerPoint: CGPoint(
          x: CGFloat(max(0, min(1, x))) * layer.bounds.width,
          y: CGFloat(max(0, min(1, y))) * layer.bounds.height
        ))
        do {
          try device.lockForConfiguration()
          defer { device.unlockForConfiguration() }
          if device.isFocusPointOfInterestSupported {
            device.focusPointOfInterest = point
            if device.isFocusModeSupported(.autoFocus) { device.focusMode = .autoFocus }
          }
          if device.isExposurePointOfInterestSupported {
            device.exposurePointOfInterest = point
            if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
          }
          device.setExposureTargetBias(0, completionHandler: nil)
          promise.resolve(true)
        } catch {
          promise.reject("E_CAMERA", error.localizedDescription)
        }
      }
    }

    AsyncFunction("setExposure") { (bias: Double, promise: Promise) in
      DispatchQueue.main.async {
        guard let (_, device) = self.activeCamera() else {
          promise.reject("E_CAMERA", "Camera preview is unavailable")
          return
        }
        do {
          try device.lockForConfiguration()
          defer { device.unlockForConfiguration() }
          let safeBias = max(Double(device.minExposureTargetBias), min(Double(device.maxExposureTargetBias), bias))
          device.setExposureTargetBias(Float(safeBias), completionHandler: nil)
          promise.resolve(safeBias)
        } catch {
          promise.reject("E_CAMERA", error.localizedDescription)
        }
      }
    }

    AsyncFunction("brandVideo") { (uri: String, promise: Promise) in
      guard let input = URL(string: uri), input.isFileURL else {
        promise.reject("E_INPUT", "A local video file is required")
        return
      }
      do {
        let asset = AVURLAsset(url: input)
        guard let sourceVideo = asset.tracks(withMediaType: .video).first else {
          promise.reject("E_VIDEO", "Video track is missing")
          return
        }
        let mix = AVMutableComposition()
        guard let videoTrack = mix.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
          promise.reject("E_VIDEO", "Could not prepare video track")
          return
        }
        let range = CMTimeRange(start: .zero, duration: asset.duration)
        try videoTrack.insertTimeRange(range, of: sourceVideo, at: .zero)
        if let sourceAudio = asset.tracks(withMediaType: .audio).first,
           let audioTrack = mix.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
          try audioTrack.insertTimeRange(range, of: sourceAudio, at: .zero)
        }

        let transform = sourceVideo.preferredTransform
        let bounds = CGRect(origin: .zero, size: sourceVideo.naturalSize).applying(transform).standardized
        let size = CGSize(width: abs(bounds.width), height: abs(bounds.height))
        let corrected = transform.concatenating(CGAffineTransform(translationX: -bounds.minX, y: -bounds.minY))
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = range
        let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
        layerInstruction.setTransform(corrected, at: .zero)
        instruction.layerInstructions = [layerInstruction]

        let videoComposition = AVMutableVideoComposition()
        videoComposition.renderSize = size
        videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
        videoComposition.instructions = [instruction]

        let videoLayer = CALayer()
        videoLayer.frame = CGRect(origin: .zero, size: size)
        let parent = CALayer()
        parent.frame = CGRect(origin: .zero, size: size)
        parent.addSublayer(videoLayer)
        let watermark = CALayer()
        watermark.frame = CGRect(x: 28, y: 28, width: min(size.width - 56, 330), height: 80)
        watermark.cornerRadius = 8
        watermark.backgroundColor = UIColor.black.withAlphaComponent(0.45).cgColor
        let word = CATextLayer()
        word.frame = CGRect(x: 14, y: 10, width: watermark.bounds.width - 28, height: 60)
        word.contentsScale = UIScreen.main.scale
        word.string = NSAttributedString(string: "RUNRUN.", attributes: [
          .font: UIFont.systemFont(ofSize: 45, weight: .black).withTraits(.traitItalic),
          .foregroundColor: UIColor.white,
          .kern: -2
        ])
        watermark.addSublayer(word)
        parent.addSublayer(watermark)
        videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parent)

        guard let exporter = AVAssetExportSession(asset: mix, presetName: AVAssetExportPresetHighestQuality) else {
          promise.reject("E_EXPORT", "Could not prepare video export")
          return
        }
        let output = FileManager.default.temporaryDirectory.appendingPathComponent("runrun-\(UUID().uuidString).mov")
        exporter.outputURL = output
        exporter.outputFileType = .mov
        exporter.videoComposition = videoComposition
        exporter.exportAsynchronously {
          if exporter.status == .completed { promise.resolve(output.absoluteString) }
          else { promise.reject("E_EXPORT", exporter.error?.localizedDescription ?? "Video export failed") }
        }
      } catch {
        promise.reject("E_EXPORT", error.localizedDescription)
      }
    }
  }

  private func activeCamera() -> (AVCaptureVideoPreviewLayer, AVCaptureDevice)? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    for window in windows where !window.isHidden {
      if let layer = findPreviewLayer(in: window.layer),
         let device = layer.session?.inputs.compactMap({ $0 as? AVCaptureDeviceInput }).first(where: { $0.device.hasMediaType(.video) })?.device {
        return (layer, device)
      }
    }
    return nil
  }

  private func findPreviewLayer(in root: CALayer) -> AVCaptureVideoPreviewLayer? {
    if let preview = root as? AVCaptureVideoPreviewLayer, preview.session?.isRunning == true { return preview }
    for child in root.sublayers ?? [] {
      if let result = findPreviewLayer(in: child) { return result }
    }
    return nil
  }
}

private extension UIFont {
  func withTraits(_ traits: UIFontDescriptor.SymbolicTraits) -> UIFont {
    guard let descriptor = fontDescriptor.withSymbolicTraits(traits) else { return self }
    return UIFont(descriptor: descriptor, size: pointSize)
  }
}
