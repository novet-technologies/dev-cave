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

    // First get the group IDs the user is a member of
    const { data: memberships, error: membershipError } = await admin
      .from("group_members")
      .select("group_id")
      .eq("user_id", session.user.id);

    if (membershipError) {
      console.error("Membership fetch error:", membershipError);
      return NextResponse.json(
        { error: "Failed to fetch memberships" },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groupIds = memberships.map((m) => m.group_id);

    // Then fetch the groups with their details
    const { data: groups, error } = await admin
      .from("groups")
      .select(
        `
        *,
        admin:admin_id(id, username, display_name),
        members:group_members(
          id,
          role,
          user:user_id(id, username, display_name, avatar_url, status)
        )
      `
      )
      .in("id", groupIds)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Groups fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch groups" },
        { status: 500 }
      );
    }

    return NextResponse.json({ groups: groups || [] });
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

    const { name, description, isPublic } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    // Create group
    const { data: group, error: groupError } = await admin
      .from("groups")
      .insert({
        name: name.trim(),
        description: description?.trim(),
        admin_id: session.user.id,
        is_public: isPublic || false,
      })
      .select("*")
      .single();

    if (groupError) {
      console.error("Group creation error:", groupError);
      return NextResponse.json(
        { error: "Failed to create group" },
        { status: 500 }
      );
    }

    // Add creator as admin member
    const { error: memberError } = await admin.from("group_members").insert({
      group_id: group.id,
      user_id: session.user.id,
      role: "admin",
    });

    if (memberError) {
      console.error("Member addition error:", memberError);
      return NextResponse.json(
        { error: "Failed to add admin to group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
