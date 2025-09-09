/*
# Initial Database Schema for Messaging Application

## New Tables
1. **profiles** - User profile information
   - `id` (uuid, primary key, references auth.users)
   - `username` (text, unique)
   - `display_name` (text)
   - `avatar_url` (text, optional)
   - `status` (text, default 'offline')
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

2. **friend_requests** - Friend relationship requests
   - `id` (uuid, primary key)
   - `sender_id` (uuid, references profiles)
   - `receiver_id` (uuid, references profiles)
   - `status` ('pending', 'accepted', 'rejected')
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

3. **friends** - Established friend relationships
   - `id` (uuid, primary key)
   - `user1_id` (uuid, references profiles)
   - `user2_id` (uuid, references profiles)
   - `created_at` (timestamptz)

4. **groups** - Chat groups
   - `id` (uuid, primary key)
   - `name` (text)
   - `description` (text, optional)
   - `admin_id` (uuid, references profiles)
   - `is_public` (boolean, default false)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

5. **group_members** - Group membership
   - `id` (uuid, primary key)
   - `group_id` (uuid, references groups)
   - `user_id` (uuid, references profiles)
   - `role` ('member', 'admin')
   - `joined_at` (timestamptz)

6. **messages** - Chat messages
   - `id` (uuid, primary key)
   - `sender_id` (uuid, references profiles)
   - `content` (text)
   - `message_type` ('text', 'poll', 'system')
   - `group_id` (uuid, references groups, nullable)
   - `receiver_id` (uuid, references profiles, nullable)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

7. **polls** - Poll information
   - `id` (uuid, primary key)
   - `message_id` (uuid, references messages)
   - `question` (text)
   - `group_id` (uuid, references groups)
   - `created_by` (uuid, references profiles)
   - `status` ('active', 'completed')
   - `results_summary` (text, nullable)
   - `created_at` (timestamptz)
   - `completed_at` (timestamptz, nullable)

8. **poll_options** - Poll answer options
   - `id` (uuid, primary key)
   - `poll_id` (uuid, references polls)
   - `option_text` (text)
   - `option_order` (integer)
   - `created_at` (timestamptz)

9. **poll_responses** - User poll responses
   - `id` (uuid, primary key)
   - `poll_id` (uuid, references polls)
   - `user_id` (uuid, references profiles)
   - `option_id` (uuid, references poll_options)
   - `created_at` (timestamptz)

## Security
- Enable RLS on all tables
- Add policies for authenticated users based on relationships
- Ensure proper data access controls