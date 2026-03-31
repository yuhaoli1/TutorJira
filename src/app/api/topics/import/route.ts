import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MATH_TOPICS } from "@/lib/topics-data";

export async function POST() {
  try {
    const supabase = await createClient();

    // 验证用户权限
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

    // 检查是否已导入过（避免重复）
    const { count } = await supabase
      .from("knowledge_topics")
      .select("*", { count: "exact", head: true })
      .eq("subject", "奥数");

    if (count && count > 0) {
      return NextResponse.json(
        { error: "奥数知识点已存在，请勿重复导入", existing_count: count },
        { status: 409 }
      );
    }

    let totalInserted = 0;

    for (const topic of MATH_TOPICS) {
      // 插入主知识点
      const { data: parent, error: parentError } = await supabase
        .from("knowledge_topics")
        .insert({
          title: `第${topic.sortOrder}讲：${topic.title}`,
          subject: "奥数",
          difficulty: 3,
          sort_order: topic.sortOrder,
          parent_id: null,
        })
        .select("id")
        .single();

      if (parentError) {
        console.error("插入主知识点失败:", parentError);
        continue;
      }

      totalInserted++;

      // 插入子知识点
      for (let i = 0; i < topic.subtopics.length; i++) {
        const { error: childError } = await supabase
          .from("knowledge_topics")
          .insert({
            title: topic.subtopics[i],
            subject: "奥数",
            difficulty: 3,
            sort_order: i + 1,
            parent_id: parent.id,
          });

        if (childError) {
          console.error("插入子知识点失败:", childError);
          continue;
        }
        totalInserted++;
      }
    }

    return NextResponse.json({
      message: "知识点导入成功",
      total_inserted: totalInserted,
    });
  } catch (error) {
    console.error("知识点导入失败:", error);
    return NextResponse.json(
      { error: "知识点导入失败" },
      { status: 500 }
    );
  }
}
