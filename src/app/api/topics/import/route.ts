import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MATH_TOPICS } from "@/lib/topics-data";

export async function POST(request: Request) {
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

    // 支持 query param ?subject=奥数 和 ?mode=sync
    const url = new URL(request.url);
    const subject = url.searchParams.get("subject") || "奥数";
    const mode = url.searchParams.get("mode") || "create"; // create | sync

    // 目前只支持奥数，后续可以添加其他学科的 topics-data
    const topicsMap: Record<string, typeof MATH_TOPICS> = {
      "奥数": MATH_TOPICS,
    };

    const topicsData = topicsMap[subject];
    if (!topicsData) {
      return NextResponse.json(
        { error: `暂不支持学科: ${subject}，可用: ${Object.keys(topicsMap).join(", ")}` },
        { status: 400 }
      );
    }

    if (mode === "sync") {
      // 同步模式：对比现有数据，增加新的、更新已有的（不删除）
      return await syncTopics(supabase, topicsData, subject);
    }

    // 创建模式：检查是否已存在
    const { count } = await supabase
      .from("knowledge_topics")
      .select("*", { count: "exact", head: true })
      .eq("subject", subject);

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: `${subject}知识点已存在（${count}个），使用 ?mode=sync 来更新`,
          existing_count: count
        },
        { status: 409 }
      );
    }

    const totalInserted = await insertTopics(supabase, topicsData, subject);

    return NextResponse.json({
      message: `${subject}知识点导入成功`,
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

async function insertTopics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicsData: typeof MATH_TOPICS,
  subject: string
): Promise<number> {
  let totalInserted = 0;

  for (const topic of topicsData) {
    const { data: parent, error: parentError } = await supabase
      .from("knowledge_topics")
      .insert({
        title: `第${topic.sortOrder}讲：${topic.title}`,
        subject,
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

    for (let i = 0; i < topic.subtopics.length; i++) {
      const { error: childError } = await supabase
        .from("knowledge_topics")
        .insert({
          title: topic.subtopics[i],
          subject,
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

  return totalInserted;
}

async function syncTopics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicsData: typeof MATH_TOPICS,
  subject: string
) {
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  // 获取现有知识点
  const { data: existing } = await supabase
    .from("knowledge_topics")
    .select("*")
    .eq("subject", subject);

  const existingByTitle = new Map(
    (existing || []).map(t => [t.title, t])
  );

  for (const topic of topicsData) {
    const parentTitle = `第${topic.sortOrder}讲：${topic.title}`;
    const existingParent = existingByTitle.get(parentTitle);

    let parentId: string;

    if (existingParent) {
      // 更新排序
      if (existingParent.sort_order !== topic.sortOrder) {
        await supabase
          .from("knowledge_topics")
          .update({ sort_order: topic.sortOrder })
          .eq("id", existingParent.id);
        updated++;
      } else {
        unchanged++;
      }
      parentId = existingParent.id;
    } else {
      // 新增
      const { data: parent } = await supabase
        .from("knowledge_topics")
        .insert({
          title: parentTitle,
          subject,
          difficulty: 3,
          sort_order: topic.sortOrder,
          parent_id: null,
        })
        .select("id")
        .single();

      if (!parent) continue;
      parentId = parent.id;
      added++;
    }

    // 处理子知识点
    for (let i = 0; i < topic.subtopics.length; i++) {
      const existingChild = existingByTitle.get(topic.subtopics[i]);
      if (existingChild) {
        unchanged++;
      } else {
        const { error } = await supabase
          .from("knowledge_topics")
          .insert({
            title: topic.subtopics[i],
            subject,
            difficulty: 3,
            sort_order: i + 1,
            parent_id: parentId,
          });
        if (!error) added++;
      }
    }
  }

  return NextResponse.json({
    message: `${subject}知识点同步完成`,
    added,
    updated,
    unchanged,
  });
}
