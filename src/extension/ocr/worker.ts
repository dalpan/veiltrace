/// <reference lib="webworker" />
// OCR worker of the extension (D-105): reads a screenshot of the visible tab on the device with the Tesseract engine. The build
// prepends the engine (tesseract.js-core, its network paths replaced by stubs that throw) and the Indonesian and English
// models as gzip+base64 strings, so nothing is fetched: the worker has no network code. It answers only its own popup.
declare const TesseractCore: (opts: Record<string, unknown>) => Promise<TessModule>;
declare const __vtOcrLang: Record<'ind' | 'eng', string>;

interface TessApi {
  Init(dataPath: null, langs: string, oem: number): number;
  SetImageFile(exif: number, angle: number): number;
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
    if (api.SetImageFile(1, 0) === 1) throw new Error('image');
    api.Recognize(null);
    const text = api.GetUTF8Text();
    api.Clear();
    mod.FS.unlink('/input');
    scope.postMessage({ id, text });
  } catch {
    ready = null;
    scope.postMessage({ id, error: true });
  } finally {
    progress = null;
  }
};
