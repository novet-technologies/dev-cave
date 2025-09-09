import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const admin = createServerSupabaseClient();
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId } = await request.json();

    if (!receiverId || receiverId === userId) {
      return NextResponse.json({ error: "Invalid receiver" }, { status: 400 });
    }

    // Check if request already exists (in either direction)
    const { data: existing } = await admin
      .from("friend_requests")
      .select("id")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`
      )
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Request already exists" },
        { status: 400 }
      );
    }

    // Check if already friends (in either direction)
    const { data: friendship } = await admin
      .from("friends")
      .select("id")
      .or(
        `and(user1_id.eq.${userId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${userId})`
      )
      .maybeSingle();

    if (friendship) {
      return NextResponse.json({ error: "Already friends" }, { status: 400 });
    }

    const payload: Database["public"]["Tables"]["friend_requests"]["Insert"] = {
      sender_id: userId,
      receiver_id: receiverId as string,
      status: "pending",
    };

    const { data: friendRequest, error } = await (admin as any)
      .from("friend_requests")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Friend request error:", error);
      return NextResponse.json(
        { error: "Failed to send request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ friendRequest });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
