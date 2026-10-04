// Minimal browser shims for the documented export examples. They let the
// package-consumer test execute the raster/card/WebM code paths without a real
// browser: every stub reports the requested MIME type instead of encoding
// pixels, so the test asserts API flow and receipts, never image fidelity.
class FakeContext {
  font = ''
  measureText(text) {
    return { width: Array.from(String(text)).length * 7 }
  }
  drawImage() {}
  clearRect() {}
}

class FakeCanvas {
  width = 0
  height = 0
  getContext() {
    return new FakeContext()
  }
  captureStream() {
    return { getTracks: () => [{ readyState: 'live', stop() {} }] }
  }
  toBlob(callback, mime) {
    queueMicrotask(() => callback(new Blob([new Uint8Array([1, 2, 3, 4])], { type: mime })))
  }
  toDataURL(mime) {
    return `data:${mime};base64,AAAA`
  }
}

class FakeImage {
  #src = ''
  onload = null
  onerror = null
  set src(value) {
    this.#src = value
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this.#src
  }
}

class FakeMediaRecorder {
  state = 'inactive'
  static isTypeSupported(mime) {
    return mime.startsWith('video/webm')
  }
  constructor(_stream, options = {}) {
    this.mimeType = options.mimeType
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    queueMicrotask(() => {
      this.ondataavailable?.({
        data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], { type: this.mimeType }),
      })
      this.onstop?.()
    })
  }
}

const storageValues = new Map()
const localStorage = {
  get length() {
    return storageValues.size
  },
  key(index) {
    return [...storageValues.keys()][index] ?? null
  },
  getItem(key) {
    return storageValues.has(key) ? storageValues.get(key) : null
  },
  setItem(key, value) {
    storageValues.set(String(key), String(value))
  },
  removeItem(key) {
    storageValues.delete(key)
  },
}

globalThis.HTMLCanvasElement = FakeCanvas
globalThis.MediaRecorder = FakeMediaRecorder
globalThis.Image = FakeImage
globalThis.window = globalThis
globalThis.localStorage = localStorage
globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return new FakeCanvas()
    return {
      tagName: String(tag).toUpperCase(),
      style: {},
      textContent: '',
      setAttribute() {},
      appendChild() {},
      click() {},
    }
  },
  head: { appendChild() {} },
  body: { appendChild() {} },
}
try {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      userAgent: 'aesthc-package-consumer',
      locks: { request: async (_name, _options, callback) => callback() },
    },
  })
} catch {
  // Node's built-in navigator stays; the local-storage example requires Web
  // Locks and reports storage.unavailable instead.
}
