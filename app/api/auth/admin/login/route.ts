import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== ADMIN LOGIN API CALLED ===');
  try {
    const body = await request.json();
    console.log('Request body received:', { email: body.email, password: body.password ? '[HIDDEN]' : 'missing' });
    const { email, password } = body;

    // Get API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('Forwarding request to backend:', `${apiUrl}/api/auth/admin/login`);
    
    // Forward request to backend
    const response = await fetch(`${apiUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log('Backend response:', { status: response.status, success: data.success });

    if (response.ok) {
      return NextResponse.json(data, { status: 200 });
    } else {
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('Admin login API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}