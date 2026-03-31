import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/questions/upload - 文件上传
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "teacher"].includes(profile.role)) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    // 确定文件类型
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
        { error: "不支持的文件类型，请上传 PDF、Word 或图片文件" },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // 用 service client 直连 Supabase（绕过 Nginx 代理，避免 Storage 上传失败）
    const serviceClient = createServiceClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 上传到 Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from("question-uploads")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("文件上传失败:", uploadError);
      return NextResponse.json(
        { error: "文件上传失败: " + uploadError.message },
        { status: 500 }
      );
    }

    // 获取文件URL（用真实 Supabase URL）
    const { data: urlData } = serviceClient.storage
      .from("question-uploads")
      .getPublicUrl(fileName);

    // 创建 question_uploads 记录
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
      console.error("创建上传记录失败:", insertError);
      return NextResponse.json(
        { error: "创建上传记录失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ upload });
  } catch (error) {
    console.error("文件上传失败:", error);
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
  }
}
