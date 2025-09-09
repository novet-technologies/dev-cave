import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = Math.min(
      Math.max(parseInt(limitParam || "20", 10) || 20, 1),
      100
    );
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

    // Fetch users (profiles) excluding current user
    const {
      data: users,
      error: usersError,
      count,
    } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, status", {
        count: "exact",
      })
      .neq("id", session.user.id)
      .order("username", { ascending: true })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error("Users fetch error:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Fetch existing friend requests and friendships for current user
    const [{ data: existingRequests }, { data: existingFriends }] =
      await Promise.all([
        supabase
          .from("friend_requests")
          .select("sender_id, receiver_id, status")
          .or(
            `sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`
          ),
        supabase
          .from("friends")
          .select("user1_id, user2_id")
          .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`),
      ]);

    const usersWithStatus = (users || []).map((user: any) => {
      const existingRequest = existingRequests?.find(
        (req) =>
          (req.sender_id === session.user.id && req.receiver_id === user.id) ||
          (req.receiver_id === session.user.id && req.sender_id === user.id)
      );

      const existingFriend = existingFriends?.find(
        (friend) =>
          (friend.user1_id === session.user.id &&
            friend.user2_id === user.id) ||
          (friend.user2_id === session.user.id && friend.user1_id === user.id)
      );

      let relationshipStatus:
        | "none"
        | "friends"
        | "request_sent"
        | "request_received" = "none";
      if (existingFriend) {
        relationshipStatus = "friends";
      } else if (existingRequest) {
        if (existingRequest.sender_id === session.user.id) {
          relationshipStatus = "request_sent";
        } else {
          relationshipStatus = "request_received";
        }
      }

      return { ...user, relationshipStatus };
    });

    return NextResponse.json({
      users: usersWithStatus,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
