import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const admin = createServerSupabaseClient();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs are required" },
        { status: 400 }
      );
    }

    // Check if user is group admin
    const { data: membership } = await admin
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only group admins can add members" },
        { status: 403 }
      );
    }

    // Check if group exists
    const { data: group, error: groupError } = await admin
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify all users are friends with the admin
    const { data: friendships } = await admin
      .from("friends")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

    const friendIds = new Set();
    friendships?.forEach((friendship) => {
      if (friendship.user1_id === session.user.id) {
        friendIds.add(friendship.user2_id);
      } else {
        friendIds.add(friendship.user1_id);
      }
    });

    const nonFriendIds = userIds.filter((userId) => !friendIds.has(userId));
    if (nonFriendIds.length > 0) {
      return NextResponse.json(
        {
          error: "Can only add friends to groups",
          nonFriends: nonFriendIds,
        },
        { status: 400 }
      );
    }

    // Check which users are already members
    const { data: existingMembers } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .in("user_id", userIds);

    const existingUserIds = existingMembers?.map((m) => m.user_id) || [];
    const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return NextResponse.json({
        message: "All users are already members",
        added: 0,
        alreadyMembers: existingUserIds,
      });
    }

    // Add new members
    const membersToAdd = newUserIds.map((userId) => ({
      group_id: groupId,
      user_id: userId,
      role: "member",
    }));

    const { error: insertError } = await admin
      .from("group_members")
      .insert(membersToAdd);

    if (insertError) {
      console.error("Member addition error:", insertError);
      return NextResponse.json(
        { error: "Failed to add members" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      added: newUserIds.length,
      alreadyMembers: existingUserIds,
      newMembers: newUserIds,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const admin = createServerSupabaseClient();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = params;

    // Check if user is a member of the group
    const { data: membership } = await admin
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    // Get all group members
    const { data: members, error } = await admin
      .from("group_members")
      .select(
        `
        id,
        role,
        joined_at,
        user:user_id(
          id,
          username,
          display_name,
          avatar_url,
          status
        )
      `
      )
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Members fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
