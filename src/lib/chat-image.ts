/** Compress a gallery photo for chat. Keeps original aspect ratio. */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const BUCKET = "chat";

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** Resize any aspect ratio photo to a chat-sized JPEG data URL. */
export function readChatImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
    return Promise.reject(new Error("Use a photo"));
  }
  if (file.size > 20_000_000) return Promise.reject(new Error("That photo is too large"));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the photo"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read the photo"));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process the photo"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.82;
        let data = canvas.toDataURL("image/jpeg", quality);
        while (data.length > 280_000 && quality > 0.3) {
          quality -= 0.08;
          data = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(data);
      };
      img.onerror = () => reject(new Error("Could not read the photo"));
      img.src = result;
    };
    reader.readAsDataURL(file);
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

async function uploadToSupabase(dataUrl: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase is not configured");
  const blob = dataUrlToBlob(dataUrl);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${name}`;
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
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${name}`;
}

export async function prepareChatImage(file: File): Promise<string> {
  const dataUrl = await readChatImage(file);
  if (!supabaseConfigured()) return dataUrl;
  try {
    return await uploadToSupabase(dataUrl);
  } catch {
    return dataUrl;
  }
}
