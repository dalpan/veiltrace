// Local OCR for the field-sample kit (D-096): macOS Vision reads the text in a screenshot on this Mac. Nothing is sent
// anywhere. Usage: swift scripts/ocr.swift <image> → one recognized line per output line, top to bottom.
import Foundation
import Vision

guard CommandLine.arguments.count == 2 else {
  FileHandle.standardError.write("usage: swift scripts/ocr.swift <image>\n".data(using: .utf8)!)
  exit(2)
}
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["id-ID", "en-US"]
request.usesLanguageCorrection = true
do {
  try VNImageRequestHandler(url: url, options: [:]).perform([request])
} catch {
  FileHandle.standardError.write("cannot read \(url.path): \(error)\n".data(using: .utf8)!)
  exit(1)
}
let observations = (request.results ?? []).sorted { a, b in
  // Vision's origin is bottom-left: higher boxes first, then left to right.
  abs(a.boundingBox.midY - b.boundingBox.midY) > 0.01 ? a.boundingBox.midY > b.boundingBox.midY : a.boundingBox.minX < b.boundingBox.minX
}
for o in observations {
  if let text = o.topCandidates(1).first?.string { print(text) }
}
