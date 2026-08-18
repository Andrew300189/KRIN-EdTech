const MAX_PASTED_COVER_BYTES = 8 * 1024 * 1024;
const MAX_PASTED_COVER_DATA_URL_LENGTH = 2_500_000;

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The copied image could not be read."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The copied image could not be read."));
    reader.readAsDataURL(file);
  });
}

/** Shrinks a pasted cover before it can be saved to the course record. */
export async function optimisePastedCourseCover(file: File) {
  if (file.size > MAX_PASTED_COVER_BYTES) throw new Error("Choose an image smaller than 8 MB.");
  if (typeof createImageBitmap !== "function") return readImageAsDataUrl(file);

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / bitmap.width, 900 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.74, 0.62]) {
      const dataUrl = canvas.toDataURL("image/webp", quality);
      if (dataUrl.length <= MAX_PASTED_COVER_DATA_URL_LENGTH) return dataUrl;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("The copied image is too large after compression. Use an image up to 1600 by 900 pixels.");
}
