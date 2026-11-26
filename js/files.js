// سيارتي · My Car — document files (PDF) kept in IndexedDB.
// Why: localStorage holds the whole app in ~5 MB, so one scanned PDF could fill it.
// A document keeps only a reference: doc.pdf = { id, name, size }. Images stay as before (doc.img).
const DB = 'sayarati-files', STORE = 'files';
let dbp = null;
const open = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
}));
const tx = (mode, fn) => open().then(db => new Promise((res, rej) => {
  const t = db.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s);
  t.oncomplete = () => res(out && 'result' in out ? out.result : undefined); t.onerror = t.onabort = () => rej(t.error);
}));
export const putFile = (id, blob) => tx('readwrite', s => s.put(blob, id));
export const getFile = id => tx('readonly', s => s.get(id));
export const delFile = id => tx('readwrite', s => s.delete(id));
export const fileKeys = () => tx('readonly', s => s.getAllKeys());

export const PDF_MAX = 10 * 1024 * 1024;
export const isPdf = f => !!f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));

/** Ask the browser not to clear app storage on its own when the phone runs low (best effort). */
export function keepStorage() { try { navigator.storage && navigator.storage.persist && navigator.storage.persisted().then(p => p || navigator.storage.persist()); } catch (e) { /* not supported */ } }

/** Remove stored files that no document refers to any more (after deletes, replacements, restores). */
export async function sweepFiles(docs) {
  try { const used = new Set((docs || []).map(d => d.pdf && d.pdf.id).filter(Boolean)); for (const k of await fileKeys()) if (!used.has(k)) await delFile(k); } catch (e) { /* storage unavailable */ }
}

/* ---------- backup: files travel inside the JSON backup as data URLs ---------- */
const toDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
export async function filesForBackup(docs) {
  const out = {};
  for (const d of docs || []) if (d.pdf && d.pdf.id) { try { const b = await getFile(d.pdf.id); if (b) out[d.pdf.id] = await toDataURL(b); } catch (e) { /* skip unreadable */ } }
  return out;
}
export async function restoreFiles(files) {
  for (const [id, url] of Object.entries(files || {})) {
    if (typeof url !== 'string' || !/^data:application\/pdf;base64,/.test(url)) continue;
    const bin = atob(url.slice(url.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    await putFile(id, new Blob([u8], { type: 'application/pdf' }));
  }
}

/* ---------- PDF pages (PDF.js, loaded only when a PDF is shown, then cached offline) ---------- */
let lib = null;
const pdfjs = () => lib || (lib = import('../vendor/pdfjs/pdf.min.js').then(m => { m.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.js', import.meta.url).href; return m; }));
/** Draw the PDF's pages into `el` (canvases fitted to its width). maxPages limits a thumbnail. Returns the page count. */
export async function renderPdf(el, blob, { maxPages = Infinity, label = '' } = {}) {
  const m = await pdfjs(), doc = await m.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const n = Math.min(doc.numPages, maxPages), w = el.clientWidth || 340, dpr = Math.min(2, window.devicePixelRatio || 1);
  el.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i), v0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: (w / v0.width) * dpr });
    const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); c.className = 'cd-pdf__page'; c.dir = 'ltr'; // PDF.js places each glyph itself: an RTL canvas would shift Arabic text
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', `${label} ${i}/${doc.numPages}`.trim());
    el.appendChild(c); await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }
  const pages = doc.numPages; doc.destroy(); return pages;
}

/* ---------- share: the phone's share sheet, else a download ---------- */
const dataURLtoBlob = u => { const [h, b] = u.split(','), bin = atob(b), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: h.slice(5, h.indexOf(';')) }); };
/** Returns 'shared' | 'downloaded' | 'cancelled'. */
export async function shareDoc({ name, blob, dataURL, title = '' }) {
  if (!blob) blob = dataURLtoBlob(dataURL);
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  return 'downloaded';
}
