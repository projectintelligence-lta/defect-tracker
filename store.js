/* Defect Tracker — storage layer.
 * Default adapter: IndexedDB in the visitor's own browser (no server).
 * For a shared deployment, replace this file with an adapter exposing the same methods
 * (see README.md → "Going multi-user"). */
(function () {
  'use strict';
  const DT = window.DT,
    U = DT.U;
  const S = (DT.store = {});
  const DBN = 'defect-tracker-v1';
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('Browser storage (IndexedDB) is not available.'));
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore('batches', { keyPath: 'id' });
        const rs = db.createObjectStore('records', { keyPath: 'id' });
        rs.createIndex('batchId', 'batchId');
        rs.createIndex('key', 'key');
        db.createObjectStore('photos', { keyPath: 'hash' });
        const n = db.createObjectStore('notes', { keyPath: 'id' });
        n.createIndex('key', 'key');
        db.createObjectStore('kv', { keyPath: 'k' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const req = (r) => new Promise((res, rej) => ((r.onsuccess = () => res(r.result)), (r.onerror = () => rej(r.error))));
  async function run(stores, mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(stores, mode);
      let out;
      Promise.resolve(fn(tx)).then((v) => (out = v), rej);
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('Storage transaction aborted'));
    });
  }

  S.init = () => open().then(() => true);

  /* key-value (settings, session prefs) */
  S.getKV = (k) => run(['kv'], 'readonly', (tx) => req(tx.objectStore('kv').get(k))).then((r) => (r ? r.v : undefined));
  S.setKV = (k, v) => run(['kv'], 'readwrite', (tx) => req(tx.objectStore('kv').put({ k, v })));

  S.getBatches = () => run(['batches'], 'readonly', (tx) => req(tx.objectStore('batches').getAll())).then((a) => a.sort((x, y) => x.uploadedAt - y.uploadedAt));
  S.getRecords = (batchId) => run(['records'], 'readonly', (tx) => req(tx.objectStore('records').index('batchId').getAll(batchId)));
  S.getRecordHistory = (key) => run(['records'], 'readonly', (tx) => req(tx.objectStore('records').index('key').getAll(key)));

  /* Save a batch with its records and any new photos in one transaction */
  S.saveBatch = async (batch, records, mediaMap) => {
    const existing = new Set(await run(['photos'], 'readonly', (tx) => req(tx.objectStore('photos').getAllKeys())));
    return run(['batches', 'records', 'photos'], 'readwrite', (tx) => {
      tx.objectStore('batches').put(batch);
      const rs = tx.objectStore('records');
      records.forEach((r) => rs.put(Object.assign({}, r, { id: batch.id + '|' + r.key, batchId: batch.id })));
      const ps = tx.objectStore('photos');
      if (mediaMap) mediaMap.forEach((m, hash) => !existing.has(hash) && ps.put({ hash, full: m.full, thumb: m.thumb, w: m.w, h: m.h }));
    });
  };

  S.deleteBatch = async (id) => {
    await run(['batches', 'records'], 'readwrite', (tx) => {
      tx.objectStore('batches').delete(id);
      const idx = tx.objectStore('records').index('batchId');
      const c = idx.openKeyCursor(IDBKeyRange.only(id));
      c.onsuccess = () => {
        const cur = c.result;
        if (cur) {
          tx.objectStore('records').delete(cur.primaryKey);
          cur.continue();
        }
      };
    });
    await S.gcPhotos();
  };

  S.gcPhotos = async () => {
    const recs = await run(['records'], 'readonly', (tx) => req(tx.objectStore('records').getAll()));
    const used = new Set();
    recs.forEach((r) => r.photos.forEach((p) => used.add(p.hash)));
    const keys = await run(['photos'], 'readonly', (tx) => req(tx.objectStore('photos').getAllKeys()));
    const drop = keys.filter((k) => !used.has(k));
    if (drop.length) await run(['photos'], 'readwrite', (tx) => drop.forEach((k) => tx.objectStore('photos').delete(k)));
    drop.forEach((k) => {
      ['thumb', 'full'].forEach((sz) => {
        const u = urlCache.get(k + sz);
        if (u) URL.revokeObjectURL(u), urlCache.delete(k + sz);
      });
    });
  };

  /* photos */
  const urlCache = new Map();
  S.photoURL = async (hash, size) => {
    const ck = hash + size;
    if (urlCache.has(ck)) return urlCache.get(ck);
    const p = await run(['photos'], 'readonly', (tx) => req(tx.objectStore('photos').get(hash)));
    if (!p) return '';
    const u = URL.createObjectURL(size === 'full' ? p.full : p.thumb);
    urlCache.set(ck, u);
    return u;
  };

  /* notes */
  S.getNotes = (key) => run(['notes'], 'readonly', (tx) => req(tx.objectStore('notes').index('key').getAll(key))).then((a) => a.sort((x, y) => x.at - y.at));
  S.addNote = (note) => run(['notes'], 'readwrite', (tx) => req(tx.objectStore('notes').put(note)));
  S.deleteNote = (id) => run(['notes'], 'readwrite', (tx) => req(tx.objectStore('notes').delete(id)));
  S.getAllNotes = () => run(['notes'], 'readonly', (tx) => req(tx.objectStore('notes').getAll()));

  S.wipe = async () => {
    await run(['batches', 'records', 'photos', 'notes'], 'readwrite', (tx) => ['batches', 'records', 'photos', 'notes'].forEach((n) => tx.objectStore(n).clear()));
    urlCache.forEach((u) => URL.revokeObjectURL(u));
    urlCache.clear();
  };

  S.usage = async () => {
    try {
      const e = await navigator.storage.estimate();
      return { used: e.usage, quota: e.quota };
    } catch (e) {
      return null;
    }
  };
})();
