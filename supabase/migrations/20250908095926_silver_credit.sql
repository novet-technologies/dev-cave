/*
# Initial Database Schema for Messaging Application

## New Tables
1. **profiles** - User profile information
2. **friend_requests** - Friend relationship requests  
3. **friends** - Established friend relationships
4. **groups** - Chat groups
5. **group_members** - Group membership
6. **messages** - Chat messages
7. **polls** - Poll information
8. **poll_options** - Poll answer options
9. **poll_responses** - User poll responses

## Security
- Enable RLS on all tables
- Add policies for authenticated users based on relationships
- Ensure proper data access controls
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  status text DEFAULT 'offline',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'poll', 'system')),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (group_id IS NOT NULL AND receiver_id IS NULL) OR 
    (group_id IS NULL AND receiver_id IS NOT NULL)
  )
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  results_summary text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  option_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create poll_responses table
CREATE TABLE IF NOT EXISTS poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Friend requests policies
CREATE POLICY "Users can view their friend requests" ON friend_requests FOR SELECT TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can create friend requests" ON friend_requests FOR INSERT TO authenticated 
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update received requests" ON friend_requests FOR UPDATE TO authenticated 
  USING (receiver_id = auth.uid());

-- Friends policies
CREATE POLICY "Users can view their friends" ON friends FOR SELECT TO authenticated 
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "Users can create friendships" ON friends FOR INSERT TO authenticated 
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- Groups policies
CREATE POLICY "Users can view public groups" ON groups FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Members can view their groups" ON groups FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid()));
CREATE POLICY "Users can create groups" ON groups FOR INSERT TO authenticated 
  WITH CHECK (admin_id = auth.uid());
CREATE POLICY "Admins can update groups" ON groups FOR UPDATE TO authenticated 
  USING (admin_id = auth.uid());

-- Group members policies
CREATE POLICY "Users can view group members" ON group_members FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));
CREATE POLICY "Users can join groups" ON group_members FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view group messages" ON messages FOR SELECT TO authenticated 
  USING (
    group_id IS NOT NULL AND 
    EXISTS (SELECT 1 FROM group_members WHERE group_id = messages.group_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can view direct messages" ON messages FOR SELECT TO authenticated 
  USING (
    group_id IS NULL AND 
    (sender_id = auth.uid() OR receiver_id = auth.uid())
  );
CREATE POLICY "Users can send messages" ON messages FOR INSERT TO authenticated 
  WITH CHECK (sender_id = auth.uid());

-- Poll policies
CREATE POLICY "Group members can view polls" ON polls FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = polls.group_id AND user_id = auth.uid()));
CREATE POLICY "Bot can create polls" ON polls FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

-- Poll options policies
CREATE POLICY "Group members can view poll options" ON poll_options FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM polls p 
    JOIN group_members gm ON p.group_id = gm.group_id 
    WHERE p.id = poll_options.poll_id AND gm.user_id = auth.uid()
  ));

-- Poll responses policies
CREATE POLICY "Users can view poll responses" ON poll_responses FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM polls p 
    JOIN group_members gm ON p.group_id = gm.group_id 
    WHERE p.id = poll_responses.poll_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Users can create their responses" ON poll_responses FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their responses" ON poll_responses FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direct_created ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user1_id);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user2_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);