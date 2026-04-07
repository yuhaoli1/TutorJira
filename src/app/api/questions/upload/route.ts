import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/questions/upload - file upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "teacher"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Please choose a file" }, { status: 400 });
    }

    // Determine file type
    let fileType: "pdf" | "docx" | "image";
    const mimeType = file.type;
    if (mimeType === "application/pdf") {
      fileType = "pdf";
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      fileType = "docx";
    } else if (mimeType.startsWith("image/")) {
      fileType = "image";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type — upload PDF, Word, or image files" },
        { status: 400 }
      );
    }

    // Generate a unique file name
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Use service client to talk to Supabase directly for Storage uploads
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from("question-uploads")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("File upload failed:", uploadError);
      return NextResponse.json(
        { error: "File upload failed: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get the file URL (use the real Supabase URL)
    const { data: urlData } = serviceClient.storage
      .from("question-uploads")
      .getPublicUrl(fileName);

    // Create a question_uploads record
    const { data: upload, error: insertError } = await supabase
      .from("question_uploads")
      .insert({
        file_url: urlData.publicUrl,
        file_type: fileType,
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create upload record:", insertError);
      return NextResponse.json(
        { error: "Failed to create upload record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ upload });
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
