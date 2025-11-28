import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, reportedBy } = body;
    
    if (!title || !description || !reportedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const bug = await prisma.bug.create({
      data: {
        title,
        description,
        priority: priority || 'medium',
        reportedBy,
        status: 'open',
      },
    });
    
    // Create initial activity
    await prisma.bugActivity.create({
      data: {
        bugId: bug?.id,
        action: 'created',
        userId: reportedBy,
        userName: reportedBy,
      },
    });
    
    return NextResponse.json({
      success: true,
      bugId: bug?.id,
      message: 'Bug created successfully',
    });
  } catch (error) {
    console.error('Error creating bug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create bug' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    const bugs = await prisma.bug.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: { activities: true },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      bugs,
    });
  } catch (error) {
    console.error('Error fetching bugs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bugs' },
      { status: 500 }
    );
  }
}
