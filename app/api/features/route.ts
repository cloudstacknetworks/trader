import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/features
 * Fetch all feature notes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (category && category !== 'all') {
      where.category = category;
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const features = await prisma.featureNote.findMany({
      where,
      orderBy: {
        releaseDate: 'desc',
      },
    });

    return NextResponse.json({ features });
  } catch (error) {
    console.error('Failed to fetch features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features
 * Create a new feature note
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, version, status, releaseDate, createdBy } = body;

    if (!title || !description || !version) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const feature = await prisma.featureNote.create({
      data: {
        title,
        description,
        category: category || 'feature',
        version,
        status: status || 'planned',
        releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
        createdBy,
      },
    });

    return NextResponse.json(
      { 
        featureId: feature.id,
        message: 'Feature note created successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create feature:', error);
    return NextResponse.json(
      { error: 'Failed to create feature note' },
      { status: 500 }
    );
  }
}
