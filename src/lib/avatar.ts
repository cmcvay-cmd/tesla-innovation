/** Square JPEG data URL for profile avatar. More robust reader. */
export function readAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpg|jpeg|png|webp|gif)$/i.test(file.name)) {
    return Promise.reject(new Error("Use a photo"));
  }
  if (file.size > 12_000_000) return Promise.reject(new Error("That photo is too large"));

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
        const size = 320;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process the photo"));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
        let quality = 0.82;
        let data = canvas.toDataURL("image/jpeg", quality);
        while (data.length > 180_000 && quality > 0.35) {
          quality -= 0.1;
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
