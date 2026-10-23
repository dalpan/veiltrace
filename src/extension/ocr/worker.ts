/// <reference lib="webworker" />
// OCR worker of the extension (D-105): reads a screenshot of the visible tab on the device with the Tesseract engine. The engine
// (its network paths replaced by stubs that throw) and the Indonesian and English models (gzip+base64) are packaged files,
// loaded with importScripts on first use; CSP script-src 'self' allows nothing else. The worker answers only its own popup.
declare const TesseractCore: (opts: Record<string, unknown>) => Promise<TessModule>;
declare const __vtOcrLang: Record<'ind' | 'eng', string>;

// Loaded by importScripts in init(); kept as globals of this worker only.

interface TessApi {
  Init(dataPath: null, langs: string, oem: number): number;
  SetImageFile(exif: number, angle: number): number;
  SetVariable(name: string, value: string): boolean;
  Recognize(monitor: null): number;
  GetUTF8Text(): string;
  Clear(): void;
}
interface TessModule {
  FS: { writeFile(path: string, data: Uint8Array): void; unlink(path: string): void };
  TessBaseAPI: new () => TessApi;
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
let ready: Promise<{ mod: TessModule; api: TessApi }> | null = null;
let progress: ((p: number) => void) | null = null;

async function gunzip(b64: string): Promise<Uint8Array> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function init(): Promise<{ mod: TessModule; api: TessApi }> {
  scope.importScripts('ocr-core.js', 'ocr-lang-ind.js', 'ocr-lang-eng.js');
  const mod = await TesseractCore({ TesseractProgress: (pct: number) => progress?.(Math.max(0, (pct - 30) / 70)) });
  for (const lang of ['ind', 'eng'] as const) mod.FS.writeFile(`${lang}.traineddata`, await gunzip(__vtOcrLang[lang]));
  const api = new mod.TessBaseAPI();
  // OEM 1: LSTM only (the bundled cores are the LSTM builds).
  if (api.Init(null, 'ind+eng', 1) !== 0) throw new Error('init');
  return { mod, api };
}

scope.onmessage = async (e: MessageEvent<{ id: number; image: ArrayBuffer }>) => {
  const { id, image } = e.data;
  try {
    ready ??= init();
    const { mod, api } = await ready;
    progress = (p) => scope.postMessage({ id, progress: p });
    mod.FS.writeFile('/input', new Uint8Array(image));
    // Two passes (D-105): global Otsu reads phone screenshots best; adaptive thresholding also reads text on a coloured panel
    // (a poster on a white page, which a global threshold turns into one dark block). The popup merges the second pass.
    const texts: string[] = [];
    for (const method of ['0', '1']) {
      api.SetVariable('thresholding_method', method);
      if (api.SetImageFile(1, 0) === 1) throw new Error('image');
      api.Recognize(null);
      texts.push(api.GetUTF8Text());
      api.Clear();
    }
    mod.FS.unlink('/input');
    scope.postMessage({ id, texts });
  } catch {
    ready = null;
    scope.postMessage({ id, error: true });
  } finally {
    progress = null;
  }
};
