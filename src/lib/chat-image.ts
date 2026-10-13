/** Compress a gallery photo for chat, then upload to Supabase Storage when configured. */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET = "chat";

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** Resize a gallery/camera photo to a chat-sized JPEG data URL. */
export function readChatImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Use a photo"));
  if (file.size > 12_000_000) return Promise.reject(new Error("That photo is too large"));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 960;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read the photo"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      let quality = 0.78;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > 160_000 && quality > 0.4) {
        quality -= 0.1;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > 180_000) {
        reject(new Error("That photo is too large"));
        return;
      }
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the photo"));
    };
    img.src = url;
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Upload a compressed photo to Supabase Storage and return its public URL. */
async function uploadToSupabase(dataUrl: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase is not configured");
  const blob = dataUrlToBlob(dataUrl);
  const name = `\( {Date.now()}- \){Math.random().toString(36).slice(2, 10)}.jpg`;
  const endpoint = `\( {SUPABASE_URL.replace(/\/ \)/, "")}/storage/v1/object/\( {BUCKET}/ \){name}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Could not upload the photo");
  }
  return `\( {SUPABASE_URL.replace(/\/ \)/, "")}/storage/v1/object/public/\( {BUCKET}/ \){name}`;
}

/** Prefer Supabase Storage; fall back to the compressed data URL so chat still works. */
export async function prepareChatImage(file: File): Promise<string> {
  const dataUrl = await readChatImage(file);
  if (!supabaseConfigured()) return dataUrl;
  try {
    return await uploadToSupabase(dataUrl);
  } catch {
    return dataUrl;
  }
}