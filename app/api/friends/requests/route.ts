import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        status,
        created_at,
        sender:sender_id(id, username, display_name, avatar_url),
        receiver:receiver_id(id, username, display_name, avatar_url)
      `)
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Requests fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    const incoming = requests?.filter(req => req.receiver?.id === session.user.id) || []
    const outgoing = requests?.filter(req => req.sender?.id === session.user.id) || []

    return NextResponse.json({ incoming, outgoing })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}