import path from "path";
import fs from "fs/promises";

export function getUploadsDir() {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
}

export async function ensureUploadsDir() {
  const dir = getUploadsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

const SAFE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"]);

export function safeExtension(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return SAFE_EXTENSIONS.has(ext) ? ext : ".jpg";
}
