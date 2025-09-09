import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

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

    // Get poll with responses
    const { data: poll, error: pollError } = await admin
      .from("polls")
      .select(
        `
        *,
        options:poll_options(
          id,
          option_text,
          option_order,
          responses:poll_responses(
            id,
            user:user_id(username, display_name)
          )
        ),
        group:group_id(
          id,
          name,
          admin_id,
          members:group_members(user_id)
        )
      `
      )
      .eq("id", pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Check if user is group admin or all members responded
    const isAdmin = poll.group.admin_id === session.user.id;
    const totalMembers = poll.group.members?.length || 0;
    const totalResponses =
      poll.options?.reduce(
        (sum, opt) => sum + (opt.responses?.length || 0),
        0
      ) || 0;
    const allResponded = totalResponses >= totalMembers;

    if (!isAdmin && !allResponded) {
      return NextResponse.json(
        { error: "Not authorized or not all members responded" },
        { status: 403 }
      );
    }

    if (poll.status === "completed") {
      return NextResponse.json({
        results: poll.results_summary,
        alreadyCompleted: true,
      });
    }

    // Prepare data for OpenAI
    const pollData = {
      question: poll.question,
      options:
        poll.options?.map((opt) => ({
          text: opt.option_text,
          votes: opt.responses?.length || 0,
          voters: opt.responses
            ?.map((r) => r.user?.display_name || r.user?.username)
            .join(", "),
        })) || [],
      totalResponses,
      totalMembers,
    };

    // Generate insights with OpenAI
    let aiInsights = "";

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that analyzes poll results and provides concise insights. Keep responses under 200 words and focus on key trends and interesting findings.",
          },
          {
            role: "user",
            content: `Analyze this poll and provide insights:
            
Question: ${poll.question}

Results:
${pollData.options
  .map((opt) => `- ${opt.text}: ${opt.votes} votes (${opt.voters})`)
  .join("\n")}

Total responses: ${totalResponses}/${totalMembers} members`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      aiInsights =
        completion.choices[0]?.message?.content ||
        "Unable to generate insights.";
    } catch (openaiError) {
      console.error("OpenAI error:", openaiError);
      aiInsights = `Poll Results Summary:
      
${pollData.options.map((opt) => `• ${opt.text}: ${opt.votes} votes`).join("\n")}

Total responses: ${totalResponses}/${totalMembers} members responded.`;
    }

    // Update poll status and save results
    const { error: updateError } = await admin
      .from("polls")
      .update({
        status: "completed",
        results_summary: aiInsights,
        completed_at: new Date().toISOString(),
      })
      .eq("id", pollId);

    if (updateError) {
      console.error("Poll update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update poll" },
        { status: 500 }
      );
    }

    // Post results as bot message
    const { error: messageError } = await admin.from("messages").insert({
      sender_id: BOT_USER_ID,
      content: `📊 Poll Results:\n\n${aiInsights}`,
      message_type: "system",
      group_id: poll.group_id,
    });

    if (messageError) {
      console.error("Results message error:", messageError);
    }

    return NextResponse.json({
      success: true,
      results: aiInsights,
      pollData,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
