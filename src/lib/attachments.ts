import "server-only";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Fuori da /public: gli allegati (potenzialmente riservati) non sono raggiungibili
// da un URL diretto, solo tramite la route protetta /api/allegati/[id].
// In produzione punta STORAGE_DIR a un percorso persistente (disco dedicato, montato
// e sottoposto a backup) del server; di default resta dentro il progetto.
const STORAGE_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(process.cwd(), "storage", "uploads");

const SUPABASE_BUCKET = "attachments";

// Su hosting serverless (Vercel) il filesystem locale è effimero: se sono
// presenti le credenziali Supabase, gli allegati vanno nel bucket Storage
// invece che su disco. In sviluppo locale, senza queste variabili, si usa
// il filesystem come prima.
function getSupabaseStorage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } }).storage.from(SUPABASE_BUCKET);
}

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

export class AttachmentValidationError extends Error {}

export async function saveAttachmentFile(file: File): Promise<{
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
}> {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new AttachmentValidationError(`"${file.name}" supera i 5MB consentiti.`);
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new AttachmentValidationError(
      `Formato non ammesso per "${file.name}": usa PDF, Word, Excel o immagini PNG/JPG.`
    );
  }

  const ext = path.extname(file.name);
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = getSupabaseStorage();
  if (storage) {
    const { error } = await storage.upload(storageKey, buffer, { contentType: file.type });
    if (error) throw new Error(`Upload allegato fallito: ${error.message}`);
  } else {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(path.join(STORAGE_DIR, storageKey), buffer);
  }

  return { storageKey, filename: file.name, mimeType: file.type, size: file.size };
}

export async function readAttachmentFile(storageKey: string): Promise<Buffer> {
  // path.basename evita che uno storageKey manomesso possa uscire dalla cartella storage.
  const safeName = path.basename(storageKey);

  const storage = getSupabaseStorage();
  if (storage) {
    const { data, error } = await storage.download(safeName);
    if (error) throw new Error(`Download allegato fallito: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(path.join(STORAGE_DIR, safeName));
}
