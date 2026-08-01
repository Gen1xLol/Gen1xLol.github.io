const DB_NAME = 'fontmaker-glyphs'
const STORE_NAME = 'glyphs'
const STORAGE_PREFIX = 'fontmaker-glyph-'

let dbPromise = null
let writeQueue = Promise.resolve()

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function settleTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'))
  })
}

function migrateFromLocalStorage(db) {
  return new Promise((resolve) => {
    const entries = []
    let failed = false
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue
        const char = String.fromCharCode(Number(key.slice(STORAGE_PREFIX.length)))
        const raw = localStorage.getItem(key)
        let strokes
        try {
          strokes = JSON.parse(raw)
        } catch {
          localStorage.removeItem(key)
          continue
        }
        if (!Array.isArray(strokes)) {
          localStorage.removeItem(key)
          continue
        }
        entries.push({ char, strokes })
      }
    } catch {
      failed = true
    }
    if (failed || entries.length === 0) {
      resolve()
      return
    }
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const entry of entries) store.put(entry)
    tx.oncomplete = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key)
        }
      } catch {}
      resolve()
    }
    tx.onerror = () => resolve()
    tx.onabort = () => resolve()
  })
}

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'char' })
      }
    }
    request.onsuccess = () => {
      migrateFromLocalStorage(request.result).then(
        () => resolve(request.result),
        () => resolve(request.result)
      )
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
    request.onblocked = () => {
      dbPromise = null
      reject(new Error('IndexedDB open was blocked'))
    }
  })
  return dbPromise
}

export async function loadStroke(char) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const entry = await requestValue(tx.objectStore(STORE_NAME).get(char))
    if (!entry || !Array.isArray(entry.strokes)) return []
    return entry.strokes
  } catch {
    return []
  }
}

function doSaveStroke(char, strokes) {
  return openDB().then(async (db) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ char, strokes })
    await settleTransaction(tx)
    return { ok: true }
  })
}

export function saveStroke(char, strokes) {
  const op = writeQueue.then(() => doSaveStroke(char, strokes), () => doSaveStroke(char, strokes))
  writeQueue = op.then(() => {}, () => {})
  return op.catch((err) => {
    console.error(`Failed to save glyph "${char}" to IndexedDB.`, err)
    return { ok: false, error: err }
  })
}

function doClearStroke(char) {
  return openDB().then(async (db) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(char)
    await settleTransaction(tx)
  })
}

export function clearStroke(char) {
  const op = writeQueue.then(() => doClearStroke(char), () => doClearStroke(char))
  writeQueue = op.then(() => {}, () => {})
  return op.catch(() => {})
}
