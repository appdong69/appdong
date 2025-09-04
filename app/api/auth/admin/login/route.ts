import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/database';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  console.log('=== ADMIN LOGIN API CALLED ===');
  try {
    const body = await request.json();
    console.log('Request body received:', { email: body.email, password: body.password ? '[HIDDEN]' : 'missing' });
    const { email, password } = body;

    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find admin user
    console.log('Querying database for user:', email);
    const result = await query(
      'SELECT id, email, password_hash, name, role, is_active FROM admin_users WHERE email = $1',
      [email]
    );
    console.log('Database query result:', result.rows.length, 'rows found');

    if (result.rows.length === 0) {
      console.log('User not found in database');
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const admin = result.rows[0];
    console.log('Found admin user:', { id: admin.id, email: admin.email, is_active: admin.is_active });

    if (!admin.is_active) {
      console.log('Admin account is deactivated');
      return NextResponse.json(
        { success: false, message: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    console.log('Verifying password...');
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    console.log('Password verification result:', isValidPassword);
    if (!isValidPassword) {
      console.log('Invalid password provided');
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    console.log('Generating JWT token for user:', admin.id);
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    });
    console.log('Token generated successfully');

    const response = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          type: 'admin',
        },
      },
    };
    console.log('Sending success response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin login API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}