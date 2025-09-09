import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiverId } = await request.json()

    if (!receiverId || receiverId === session.user.id) {
      return NextResponse.json({ error: 'Invalid receiver' }, { status: 400 })
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id')
      .or(`sender_id.eq.${session.user.id}.and.receiver_id.eq.${receiverId},sender_id.eq.${receiverId}.and.receiver_id.eq.${session.user.id}`)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Request already exists' }, { status: 400 })
    }

    // Check if already friends
    const { data: friendship } = await supabase
      .from('friends')
      .select('id')
      .or(`user1_id.eq.${session.user.id}.and.user2_id.eq.${receiverId},user1_id.eq.${receiverId}.and.user2_id.eq.${session.user.id}`)
      .single()

    if (friendship) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 })
    }

    const { data: friendRequest, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: session.user.id,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select('*')
      .single()

    if (error) {
      console.error('Friend request error:', error)
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
    }

    return NextResponse.json({ friendRequest })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}