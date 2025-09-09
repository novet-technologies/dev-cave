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

    const { data: friendships, error } = await admin
      .from("friends")
      .select(
        `
        id,
        created_at,
        user1:user1_id(id, username, display_name, avatar_url, status),
        user2:user2_id(id, username, display_name, avatar_url, status)
      `
      )
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Friends fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch friends" },
        { status: 500 }
      );
    }

    const friends =
      friendships?.map((friendship) => {
        const friend =
          friendship.user1?.id === session.user.id
            ? friendship.user2
            : friendship.user1;

        return {
          id: friendship.id,
          friend,
          created_at: friendship.created_at,
        };
      }) || [];

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
