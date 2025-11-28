import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bug = await prisma.bug.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!bug) {
      return NextResponse.json(
        { success: false, error: 'Bug not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      bug,
    });
  } catch (error) {
    console.error('Error fetching bug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bug' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, priority, assignedTo } = body;
    
    // Fetch current bug data
    const currentBug = await prisma.bug.findUnique({
      where: { id },
    });
    
    if (!currentBug) {
      return NextResponse.json(
        { success: false, error: 'Bug not found' },
        { status: 404 }
      );
    }
    
    // Update bug
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    
    const bug = await prisma.bug.update({
      where: { id: id },
      data: updateData,
    });
    
    // Create activity records for changes
    if (status && status !== currentBug?.status) {
      await prisma.bugActivity.create({
        data: {
          bugId: id,
          action: 'status_changed',
          field: 'status',
          oldValue: currentBug?.status,
          newValue: status,
          userId: 'system',
          userName: 'System',
        },
      });
    }
    
    if (priority && priority !== currentBug?.priority) {
      await prisma.bugActivity.create({
        data: {
          bugId: id,
          action: 'updated',
          field: 'priority',
          oldValue: currentBug?.priority,
          newValue: priority,
          userId: 'system',
          userName: 'System',
        },
      });
    }
    
    if (assignedTo !== undefined && assignedTo !== currentBug?.assignedTo) {
      await prisma.bugActivity.create({
        data: {
          bugId: id,
          action: 'assigned',
          field: 'assignedTo',
          oldValue: currentBug?.assignedTo || 'unassigned',
          newValue: assignedTo || 'unassigned',
          userId: 'system',
          userName: 'System',
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      bug,
      message: 'Bug updated successfully',
    });
  } catch (error) {
    console.error('Error updating bug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update bug' },
      { status: 500 }
    );
  }
}
