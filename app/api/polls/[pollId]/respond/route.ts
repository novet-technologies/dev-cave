import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { pollId: string } }
) {
  try {
    const admin = createServerSupabaseClient();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pollId } = params;
    const { optionId } = await request.json();

    if (!optionId) {
      return NextResponse.json(
        { error: "Option ID is required" },
        { status: 400 }
      );
    }

    // Verify poll exists and user can respond
    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select(
        `
        *,
        options:poll_options(id, option_text)
      `
      )
      .eq("id", pollId)
      .eq("status", "active")
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: "Poll not found or inactive" },
        { status: 404 }
      );
    }

    // Verify user is group member
    const { data: membership } = await admin
      .from("group_members")
      .select("id")
      .eq("group_id", poll.group_id)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    // Verify option exists
    const validOption = poll.options?.find((opt) => opt.id === optionId);
    if (!validOption) {
      return NextResponse.json({ error: "Invalid option" }, { status: 400 });
    }

    // Upsert response (allows changing vote)
    const { error: responseError } = await admin.from("poll_responses").upsert({
      poll_id: pollId,
      user_id: session.user.id,
      option_id: optionId,
    });

    if (responseError) {
      console.error("Response creation error:", responseError);
      return NextResponse.json(
        { error: "Failed to record response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
