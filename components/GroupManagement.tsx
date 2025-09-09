"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, X, Crown, User } from "lucide-react";

interface GroupMember {
  id: string;
  role: "admin" | "member";
  joined_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    status: "online" | "offline" | "away";
  };
}

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: "online" | "offline" | "away";
}

interface GroupManagementProps {
  groupId: string;
  isAdmin: boolean;
  onMemberAdded?: () => void;
}

export function GroupManagement({
  groupId,
  isAdmin,
  onMemberAdded,
}: GroupManagementProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      loadUsers();
    }
  }, [isOpen, groupId]);

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Failed to load members:", error);
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/friends");
      if (response.ok) {
        const data = await response.json();
        // Extract friends from the response
        const friends =
          data.friends?.map((friendship: any) => friendship.friend) || [];
        setAllUsers(friends);
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    const isNotMember = !members.some((member) => member.user.id === user.id);
    const matchesSearch =
      user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());
    return isNotMember && matchesSearch;
  });

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setAdding(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: `Added ${data.added} member(s) to the group`,
        });
        setSelectedUsers([]);
        setSearchQuery("");
        loadMembers();
        onMemberAdded?.();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add members",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add members:", error);
      toast({
        title: "Error",
        description: "Failed to add members",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Group Members</h3>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.avatar_url} />
                      <AvatarFallback>
                        {member.user.display_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                        member.user.status
                      )}`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{member.user.display_name}</p>
                    <p className="text-sm text-gray-500">
                      @{member.user.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {member.role === "admin" ? (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <User className="h-3 w-3 mr-1" />
                      Member
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Group Members</DialogTitle>
          <DialogDescription>
            Add friends to your group or view current members. Only your friends
            can be added to the group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Members */}
          <div>
            <h4 className="font-medium mb-2">
              Current Members ({members.length})
            </h4>
            <ScrollArea className="h-32 border rounded-lg p-2">
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.avatar_url} />
                          <AvatarFallback>
                            {member.user.display_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${getStatusColor(
                            member.user.status
                          )}`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.user.display_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{member.user.username}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        member.role === "admin" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {member.role === "admin" ? (
                        <>
                          <Crown className="h-2 w-2 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="h-2 w-2 mr-1" />
                          Member
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Add Members */}
          <div>
            <h4 className="font-medium mb-2">Add Friends to Group</h4>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        selectedUsers.includes(user.id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.display_name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${getStatusColor(
                              user.status
                            )}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {user.display_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <X className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      {searchQuery
                        ? "No friends found"
                        : "No friends available to add"}
                    </p>
                  )}
                </div>
              </ScrollArea>

              {selectedUsers.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedUsers.length} user(s) selected
                  </p>
                  <Button
                    onClick={handleAddMembers}
                    disabled={adding}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {adding ? "Adding..." : "Add Members"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
