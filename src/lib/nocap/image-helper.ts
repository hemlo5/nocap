/**
 * Utility functions for compressing and uploading images client-side
 */

export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(reader.result as string);
        }

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp if supported, otherwise jpeg
        let result = "";
        try {
          result = canvas.toDataURL("image/webp", quality);
          if (!result.startsWith("data:image/webp")) {
            result = canvas.toDataURL("image/jpeg", quality);
          }
        } catch {
          result = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(result);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(fileOrDataUrl: File | string): Promise<string> {
  let dataUrl = "";
  if (typeof fileOrDataUrl === "string") {
    dataUrl = fileOrDataUrl;
  } else {
    dataUrl = await compressImage(fileOrDataUrl);
  }

  try {
    const res = await fetch("/api/nocap/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn("[Upload helper] API upload fallback to dataUrl:", err);
  }

  return dataUrl;
}
