// Lecture/redimensionnement d'images côté client (avatar utilisateur),
// partagé entre le Profil et le drawer Compte.
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}

export async function resizeImageFileToDataUrl(file, maxSize = 512, quality = 0.86) {
  const source = await readFileAsDataUrl(file);
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return source;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        resolve(source);
        return;
      }

      const scale = Math.min(1, maxSize / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(source);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}
