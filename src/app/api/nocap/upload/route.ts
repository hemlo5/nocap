import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getGoogleUser, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    let fileName = `upload-${Date.now()}.jpg`;
    let fallbackDataUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type;
      fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      fallbackDataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    } else {
      // JSON body with dataUrl
      const body = await request.json().catch(() => null);
      if (!body || typeof body.dataUrl !== "string") {
        return NextResponse.json({ error: "Missing image data" }, { status: 400 });
      }

      const dataUrl = body.dataUrl as string;
      fallbackDataUrl = dataUrl;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], "base64");
        const ext = mimeType.split("/")[1] || "jpg";
        fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      }
    }

    // Try Supabase Storage upload if configured
    if (isSupabaseConfigured() && fileBuffer) {
      try {
        const admin = createAdminClient();
        const bucketName = "nocap-media";

        // Upload to nocap-media bucket
        const { data: uploadData, error: uploadError } = await admin.storage
          .from(bucketName)
          .upload(`photos/${fileName}`, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = admin.storage
            .from(bucketName)
            .getPublicUrl(uploadData.path);

          if (publicUrlData?.publicUrl) {
            return NextResponse.json({
              url: publicUrlData.publicUrl,
              storage: "supabase",
            });
          }
        }
      } catch (storageErr) {
        console.warn("[Upload] Supabase Storage upload fallback:", storageErr);
      }
    }

    // Resilient fallback: Return data URL so images ALWAYS work immediately
    if (fallbackDataUrl) {
      return NextResponse.json({
        url: fallbackDataUrl,
        storage: "inline",
      });
    }

    return NextResponse.json({ error: "Failed to process image upload" }, { status: 500 });
  } catch (err) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json({ error: "Internal server error during upload" }, { status: 500 });
  }
}
