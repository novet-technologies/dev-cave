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

    const { requestId, action } = await request.json();

    if (!requestId || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get the friend request
    const { data: friendRequest, error: fetchError } = await admin
      .from("friend_requests")
      .select("*")
      .eq("id", requestId)
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .single();

    if (fetchError || !friendRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Update the request status
    const { error: updateError } = await admin
      .from("friend_requests")
      .update({
        status: action === "accept" ? "accepted" : "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Update request error:", updateError);
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      );
    }

    // If accepted, create friendship
    if (action === "accept") {
      const friendshipPayload: Database["public"]["Tables"]["friends"]["Insert"] =
        {
          user1_id: friendRequest.sender_id,
          user2_id: friendRequest.receiver_id,
        };

      const { error: friendshipError } = await (admin as any)
        .from("friends")
        .insert(friendshipPayload);

      if (friendshipError) {
        console.error("Friendship creation error:", friendshipError);
        return NextResponse.json(
          { error: "Failed to create friendship" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
