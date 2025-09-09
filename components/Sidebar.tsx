"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/components/SocketProvider";
import {
  MessageCircle,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Search,
  Plus,
  Bell,
  Circle,
} from "lucide-react";

interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    status: "online" | "offline" | "away";
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  admin_id: string;
  members: Array<{
    user: {
      id: string;
      username: string;
      display_name: string;
      status: "online" | "offline" | "away";
    };
  }>;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export function Sidebar() {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChat = searchParams.get("chat");
  const chatType = searchParams.get("type");

  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"friends" | "groups" | "requests">(
    "friends"
  );
  const [loading, setLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    loadFriends();
    loadGroups();
    loadFriendRequests();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("friend:request", (request) => {
      setFriendRequests((prev) => [request, ...prev]);
    });

    socket.on("friend:accepted", () => {
      loadFriends();
      loadFriendRequests();
    });

    socket.on("user:online", (userId) => {
      setFriends((prev) =>
        prev.map((friend) =>
          friend.friend.id === userId
            ? { ...friend, friend: { ...friend.friend, status: "online" } }
            : friend
        )
      );
    });

    socket.on("user:offline", (userId) => {
      setFriends((prev) =>
        prev.map((friend) =>
          friend.friend.id === userId
            ? { ...friend, friend: { ...friend.friend, status: "offline" } }
            : friend
        )
      );
    });

    return () => {
      socket.off("friend:request");
      socket.off("friend:accepted");
      socket.off("user:online");
      socket.off("user:offline");
    };
  }, [socket]);

  const loadFriends = async () => {
    try {
      const response = await fetch("/api/friends");
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await fetch("/api/friends/requests");
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.incoming);
      }
    } catch (error) {
      console.error("Failed to load friend requests:", error);
    }
  };

  const handleChatSelect = (id: string, type: "friend" | "group") => {
    router.push(`/dashboard?chat=${id}&type=${type}`);

    // Join socket room
    if (socket) {
      socket.emit("join:room", type === "group" ? id : `direct:${id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">ChatFlow</h1>
          </div>
          <div className="flex items-center space-x-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Welcome, {session?.user?.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === "friends"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="h-4 w-4 mx-auto mb-1" />
          Friends
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === "groups"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageCircle className="h-4 w-4 mx-auto mb-1" />
          Groups
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 p-3 text-sm font-medium relative ${
            activeTab === "requests"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Bell className="h-4 w-4 mx-auto mb-1" />
          Requests
          {friendRequests.length > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 min-w-[20px] h-5 flex items-center justify-center rounded-full">
              {friendRequests.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "friends" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Friends ({friends.length})
              </h3>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/dashboard/users")}
                >
                  <Users className="h-4 w-4 mr-1" /> Browse
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/friends/search")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {friends.map((friendship) => (
                <button
                  key={friendship.id}
                  onClick={() =>
                    handleChatSelect(friendship.friend.id, "friend")
                  }
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    currentChat === friendship.friend.id &&
                    chatType === "friend"
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {friendship.friend.display_name[0].toUpperCase()}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                          friendship.friend.status
                        )}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {friendship.friend.display_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        @{friendship.friend.username}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {friends.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No friends yet</p>
                  <p className="text-xs">
                    Search and add friends to start chatting
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                Groups ({groups.length})
              </h3>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/groups/create")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>

            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleChatSelect(group.id, "group")}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    currentChat === group.id && chatType === "group"
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {group.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {group.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {group.members.length} members
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {groups.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No groups yet</p>
                  <p className="text-xs">
                    Create or join groups to collaborate
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="p-4 space-y-4">
            <h3 className="font-medium text-gray-900">
              Friend Requests ({friendRequests.length})
            </h3>

            <div className="space-y-3">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {request.sender.display_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {request.sender.display_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        @{request.sender.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleFriendResponse(request.id, "accept")}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFriendResponse(request.id, "reject")}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}

              {friendRequests.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">No pending requests</p>
                  <p className="text-xs">Friend requests will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );

  async function handleFriendResponse(
    requestId: string,
    action: "accept" | "reject"
  ) {
    try {
      const response = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (response.ok) {
        setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
        if (action === "accept") {
          loadFriends();
        }
      }
    } catch (error) {
      console.error("Failed to respond to friend request:", error);
    }
  }
}
