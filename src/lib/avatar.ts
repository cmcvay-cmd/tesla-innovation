/** Square JPEG data URL, small enough to store on the profile. */
export function readAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Use a photo"));
  if (file.size > 8_000_000) return Promise.reject(new Error("That photo is too large"));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 320;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read the photo"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(url);
      let quality = 0.82;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > 150_000 && quality > 0.4) {
        quality -= 0.12;
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
