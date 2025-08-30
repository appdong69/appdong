import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString ? `${apiUrl}/api/analytics/admin/export?${queryString}` : `${apiUrl}/api/analytics/admin/export`;
    
    // Forward request to backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      // Forward the blob response
      const blob = await response.blob();
      const headers = new Headers();
      headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
      headers.set('Content-Disposition', response.headers.get('Content-Disposition') || 'attachment; filename="analytics-export.csv"');
      
      return new NextResponse(blob, {
        status: 200,
        headers,
      });
    } else {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('Admin analytics export API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}