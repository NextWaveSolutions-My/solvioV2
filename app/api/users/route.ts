/**
 * Users API Route
 *
 * GET /api/users - Get all users (for conversation creation)
 * GET /api/users?email=<email> - Scoped lookup by exact email match.
 *   Accepts either a session cookie or the internal API key (n8n uses
 *   this to check whether a WhatsApp shadow user already exists before
 *   creating one, without needing access to the full user list).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";
import { hasValidInternalApiKey } from "@/lib/internal-api-auth";

function toSimpleUser(user: any) {
  return {
    id: user.id || user._id?.toString(),
    name: user.name || "Unknown User",
    email: user.email,
    role: user.role || "customer",
    image: user.image || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const email = req.nextUrl.searchParams.get("email");

    if (email) {
      if (!session?.user && !hasValidInternalApiKey(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const usersCollection = await getCollection("user");
      const user = await usersCollection.findOne({ email });

      return NextResponse.json({ users: user ? [toSimpleUser(user)] : [] });
    }

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usersCollection = await getCollection("user");

    // Get all users, sorted by name
    const users = await usersCollection.find({}).sort({ name: 1 }).toArray();

    // Map to simple user objects with only necessary fields
    const simpleUsers = users.map(toSimpleUser);

    return NextResponse.json({ users: simpleUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
