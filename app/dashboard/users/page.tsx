"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus } from "lucide-react";

interface UserItem {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: "online" | "offline" | "away";
  relationshipStatus: "none" | "friends" | "request_sent" | "request_received";
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers(0);
  }, []);

  const loadUsers = async (newOffset: number) => {
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/users", window.location.origin);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(newOffset));
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setOffset(data.offset);
    } catch (e: any) {
      setError(e.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: userId }),
      });
      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, relationshipStatus: "request_sent" } : u
          )
        );
      }
    } catch (e) {
      console.error("Failed to send friend request:", e);
    }
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.display_name || "").toLowerCase().includes(q)
    );
  });

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Browse Users</h1>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/friends/search")}
        >
          Advanced Search
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by username or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading users...
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="p-4 border border-gray-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.display_name?.[0]?.toUpperCase() ||
                    user.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {user.display_name || user.username}
                  </div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {user.relationshipStatus === "friends" && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    Friends
                  </Badge>
                )}
                {user.relationshipStatus === "request_sent" && (
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-300"
                  >
                    Pending
                  </Badge>
                )}
                {user.relationshipStatus === "request_received" && (
                  <Badge
                    variant="outline"
                    className="text-blue-600 border-blue-300"
                  >
                    Respond
                  </Badge>
                )}
                {user.relationshipStatus === "none" && (
                  <Button size="sm" onClick={() => sendFriendRequest(user.id)}>
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                  </Button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              No users found
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          disabled={!canPrev}
          onClick={() => loadUsers(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <div className="text-sm text-gray-500">
          {Math.min(total, offset + 1)} -{" "}
          {Math.min(total, offset + filtered.length)} of {total}
        </div>
        <Button
          variant="outline"
          disabled={!canNext}
          onClick={() => loadUsers(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
