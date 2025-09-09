import { NextRequest } from 'next/server'
import { initializeSocket } from '@/lib/socket'

export async function GET(req: NextRequest) {
  // This endpoint is for establishing the Socket.IO connection
  // The actual Socket.IO server will be initialized in the socket handler
  return new Response('Socket.IO endpoint', { status: 200 })
}