import { NextResponse } from "next/server";
import { generateRecurringTasks } from "@/lib/recurring-tasks";

export async function POST() {
  try {
    const count = await generateRecurringTasks();
    return NextResponse.json({ generated: count });
  } catch (error) {
    console.error("Failed to generate recurring tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate recurring tasks" },
      { status: 500 }
    );
  }
}
