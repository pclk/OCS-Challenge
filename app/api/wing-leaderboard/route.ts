import { NextResponse } from "next/server";
import { getWingLeaderboard } from "@/lib/db";

export async function GET() {
  try {
    const leaderboard = await getWingLeaderboard(3); // top 3 wings
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching wing leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch wing leaderboard" },
      { status: 500 }
    );
  }
}
