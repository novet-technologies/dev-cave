import { Server as SocketIOServer } from "socket.io";
import { Server as NetServer } from "http";
import { NextApiResponse } from "next";
import { supabase } from "./supabase";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export interface ServerToClientEvents {
  "message:new": (message: any) => void;
  "message:update": (message: any) => void;
  "poll:new": (poll: any) => void;
  "poll:update": (poll: any) => void;
  "poll:response": (response: any) => void;
  "user:online": (userId: string) => void;
  "user:offline": (userId: string) => void;
  "friend:request": (request: any) => void;
  "friend:accepted": (friendship: any) => void;
}

export interface ClientToServerEvents {
  "join:room": (roomId: string) => void;
  "leave:room": (roomId: string) => void;
  "message:send": (data: {
    content: string;
    groupId?: string;
    receiverId?: string;
  }) => void;
  "poll:respond": (data: { pollId: string; optionId: string }) => void;
  "user:status": (status: "online" | "offline" | "away") => void;
}

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export const initializeSocket = (server: NetServer) => {
  if (!io) {
    io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
      server,
      {
        path: "/api/socket",
        addTrailingSlash: false,
        cors: {
          origin:
            process.env.NODE_ENV === "production"
              ? false
              : ["http://localhost:3000"],
          methods: ["GET", "POST"],
        },
      }
    );

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("join:room", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
      });

      socket.on("leave:room", (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
      });

      socket.on("message:send", async (data) => {
        try {
          // Insert message to database
          const { data: message, error } = await supabase
            .from("messages")
            .insert({
              content: data.content,
              sender_id: socket.data.userId,
              group_id: data.groupId,
              receiver_id: data.receiverId,
            })
            .select("*")
            .single();

          if (error) throw error;

          // Emit to appropriate room
          const roomId = data.groupId || `direct:${data.receiverId}`;
          io.to(roomId).emit("message:new", message);
        } catch (error) {
          console.error("Error sending message:", error);
        }
      });

      socket.on("poll:respond", async (data) => {
        try {
          // Insert poll response
          const { error } = await supabase.from("poll_responses").upsert({
            poll_id: data.pollId,
            user_id: socket.data.userId,
            option_id: data.optionId,
          });

          if (error) throw error;

          // Get poll info to emit to group
          const { data: poll } = await supabase
            .from("polls")
            .select("group_id")
            .eq("id", data.pollId)
            .single();

          if (poll) {
            io.to(poll.group_id).emit("poll:response", {
              pollId: data.pollId,
              userId: socket.data.userId,
              optionId: data.optionId,
            });
          }
        } catch (error) {
          console.error("Error responding to poll:", error);
        }
      });

      socket.on("user:status", async (status) => {
        try {
          await supabase
            .from("profiles")
            .update({ status })
            .eq("id", socket.data.userId);

          socket.broadcast.emit("user:online", socket.data.userId);
        } catch (error) {
          console.error("Error updating user status:", error);
        }
      });

      socket.on("disconnect", async () => {
        console.log("User disconnected:", socket.id);
        try {
          if (socket.data.userId) {
            await supabase
              .from("profiles")
              .update({ status: "offline" })
              .eq("id", socket.data.userId);

            socket.broadcast.emit("user:offline", socket.data.userId);
          }
        } catch (error) {
          console.error("Error updating user status on disconnect:", error);
        }
      });
    });
  }

  return io;
};

export const getSocket = () => {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
};
