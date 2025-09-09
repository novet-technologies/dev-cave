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

    // Check if group exists and is public or user is invited
    const { data: group, error: groupError } = await admin
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.is_public) {
      return NextResponse.json({ error: "Group is private" }, { status: 403 });
    }

    // Check if already a member
    const { data: existingMember } = await admin
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", session.user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Add user to group
    const { error: memberError } = await admin.from("group_members").insert({
      group_id: groupId,
      user_id: session.user.id,
      role: "member",
    });

    if (memberError) {
      console.error("Member addition error:", memberError);
      return NextResponse.json(
        { error: "Failed to join group" },
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
