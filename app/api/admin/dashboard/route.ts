import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  console.log('Admin dashboard API called');
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Verifying token...');
    
    // Verify JWT token
    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('Token verified for user:', decoded.email);
    } catch (error) {
      console.log('Token verification failed:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (decoded.type !== 'admin') {
      console.log('User is not admin:', decoded.type);
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    console.log('Fetching dashboard data from database...');
    
    // Get dashboard statistics
    const [clientsResult, notificationsResult, subscribersResult] = await Promise.all([
      query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active = true THEN 1 END) as active FROM clients'),
      query('SELECT COUNT(*) as total FROM push_notifications WHERE created_at >= CURRENT_DATE'),
      query('SELECT COUNT(*) as total FROM push_subscriptions WHERE is_active = true')
    ]);

    const stats = {
      totalClients: parseInt(clientsResult.rows[0].total) || 0,
      activeClients: parseInt(clientsResult.rows[0].active) || 0,
      totalSubscribers: parseInt(subscribersResult.rows[0].total) || 0,
      notificationsToday: parseInt(notificationsResult.rows[0].total) || 0
    };

    // Get recent notifications
    const recentNotificationsResult = await query(`
      SELECT 
        pn.id,
        pn.title,
        pn.message,
        pn.status,
        pn.created_at,
        c.name as client_name
      FROM push_notifications pn
      JOIN clients c ON pn.client_id = c.id
      ORDER BY pn.created_at DESC
      LIMIT 5
    `);

    // Get top clients
    const topClientsResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.email,
        COUNT(pn.id) as notification_count
      FROM clients c
      LEFT JOIN push_notifications pn ON c.id = pn.client_id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.email
      ORDER BY notification_count DESC
      LIMIT 5
    `);

    console.log('Dashboard data fetched successfully');
    
    return NextResponse.json({
      success: true,
      stats,
      recentNotifications: recentNotificationsResult.rows,
      topClients: topClientsResult.rows
    });
    
  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}