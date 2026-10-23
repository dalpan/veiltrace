// On-device OCR for the "Cek Pesan" app (D-104), built as its own file (ocr/ocr.js) and loaded only when the user picks or
// shares an image. Tesseract.js runs in a same-origin worker with the core and the Indonesian and English models served
// from ocr/ next to the app: no CDN, no upload, nothing stored. The image never leaves the device.
import { createWorker, OEM, type Worker } from 'tesseract.js';
import { mergeOcrPasses } from './ocr-text.js';

export interface OcrApi {
  /** Cleaned text lines read from the image (two passes merged). `progress` receives 0…1 while the model loads and reads. */
  recognize(image: Blob, progress?: (p: number) => void): Promise<string[]>;
}

/** Folder of this script (…/app/ocr/), captured while it runs: the worker, core and models sit next to it. */
const BASE = new URL('.', (document.currentScript as HTMLScriptElement).src).href;
let worker: Promise<Worker> | null = null;
let onProgress: ((p: number) => void) | undefined;

function getWorker(): Promise<Worker> {
  worker ??= createWorker(['ind', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${BASE}worker.min.js`,
    corePath: `${BASE}core/`,
    langPath: `${BASE}lang/`,
    workerBlobURL: false,
    cacheMethod: 'none',
    gzip: true,
    logger: (m: { status: string; progress: number }) => onProgress?.(m.status === 'recognizing text' ? 0.5 + m.progress / 2 : m.progress / 2),
  });
  return worker;
}

const api: OcrApi = {
  async recognize(image, progress) {
    onProgress = progress;
    try {
      const w = await getWorker();
      // Two passes, as in the extension (D-105): global Otsu, then adaptive thresholding for text on coloured panels.
      await w.setParameters({ thresholding_method: '0' } as Record<string, string>);
      const first = (await w.recognize(image)).data.text;
      await w.setParameters({ thresholding_method: '1' } as Record<string, string>);
      const second = (await w.recognize(image)).data.text;
      return mergeOcrPasses(first, second);
    } finally {
      onProgress = undefined;
    }
  },
};

(window as unknown as { __vtOcr?: OcrApi }).__vtOcr = api;
