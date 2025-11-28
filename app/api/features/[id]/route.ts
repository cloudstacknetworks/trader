import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/features/[id]
 * Fetch a specific feature note by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const feature = await prisma.featureNote.findUnique({
      where: { id },
    });

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ feature });
  } catch (error) {
    console.error('Failed to fetch feature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/features/[id]
 * Update a feature note's status or other fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, category, version, releaseDate } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (category) updateData.category = category;
    if (version) updateData.version = version;
    if (releaseDate) updateData.releaseDate = new Date(releaseDate);

    const feature = await prisma.featureNote.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      feature,
      message: 'Feature note updated successfully',
    });
  } catch (error) {
    console.error('Failed to update feature:', error);
    return NextResponse.json(
      { error: 'Failed to update feature note' },
      { status: 500 }
    );
  }
}
