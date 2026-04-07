import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/tasks/attachments - upload task attachment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignment_id") as string | null;

    if (!file || !assignmentId) {
      return NextResponse.json({ error: "Missing file or task ID" }, { status: 400 });
    }

    // Only allow images
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are supported" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must not exceed 10MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `task-attachments/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from("question-uploads") // reuse existing bucket
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Attachment upload failed:", uploadError);
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = serviceClient.storage
      .from("question-uploads")
      .getPublicUrl(fileName);

    // Save attachment record
    const { data: attachment, error: insertError } = await supabase
      .from("task_attachments")
      .insert({
        task_assignment_id: assignmentId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Attachment upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
