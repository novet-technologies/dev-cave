import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const admin = createServerSupabaseClient();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const receiverId = searchParams.get("receiverId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = admin
      .from("messages")
      .select(
        `
        *,
        sender:sender_id(id, username, display_name, avatar_url),
        receiver:receiver_id(id, username, display_name, avatar_url),
        poll:polls(
          id,
          question,
          status,
          results_summary,
          options:poll_options(id, option_text, option_order),
          responses:poll_responses(
            id,
            user:user_id(id, username, display_name),
            option:option_id(id, option_text)
          )
        )
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else if (receiverId) {
      query = query
        .is("group_id", null)
        .or(
          `and(sender_id.eq.${session.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${session.user.id})`
        );
    } else {
      return NextResponse.json(
        { error: "groupId or receiverId required" },
        { status: 400 }
      );
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("Messages fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages?.reverse() || [] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createServerSupabaseClient();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, groupId, receiverId } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (!groupId && !receiverId) {
      return NextResponse.json(
        { error: "groupId or receiverId is required" },
        { status: 400 }
      );
    }

    // Validate permissions
    if (groupId) {
      const { data: membership } = await admin
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", session.user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "Not a member of this group" },
          { status: 403 }
        );
      }
    } else if (receiverId) {
      // Check if users are friends
      const { data: friendship } = await admin
        .from("friends")
        .select("id")
        .or(
          `and(user1_id.eq.${session.user.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${session.user.id})`
        )
        .single();

      if (!friendship) {
        return NextResponse.json(
          { error: "Can only message friends" },
          { status: 403 }
        );
      }
    }

    const { data: message, error } = await admin
      .from("messages")
      .insert({
        content: content.trim(),
        sender_id: session.user.id,
        group_id: groupId,
        receiver_id: receiverId,
        message_type: "text",
      })
      .select(
        `
        *,
        sender:sender_id(id, username, display_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error("Message creation error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
