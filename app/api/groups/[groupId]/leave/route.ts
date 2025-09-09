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

    // Check if user is a member
    const { data: membership } = await admin
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 400 });
    }

    // Check if user is admin - handle admin transfer if needed
    if (membership.role === "admin") {
      const { data: otherMembers } = await admin
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .neq("user_id", session.user.id);

      if (otherMembers && otherMembers.length > 0) {
        // Transfer admin to first member
        await admin
          .from("group_members")
          .update({ role: "admin" })
          .eq("group_id", groupId)
          .eq("user_id", otherMembers[0].user_id);

        await admin
          .from("groups")
          .update({ admin_id: otherMembers[0].user_id })
          .eq("id", groupId);
      } else {
        // Delete group if no other members
        await admin.from("groups").delete().eq("id", groupId);
        return NextResponse.json({ success: true, groupDeleted: true });
      }
    }

    // Remove user from group
    const { error } = await admin
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Leave group error:", error);
      return NextResponse.json(
        { error: "Failed to leave group" },
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
