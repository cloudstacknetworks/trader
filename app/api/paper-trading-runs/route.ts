
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - List all paper trading runs for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const runs = await prisma.paperTradingRun.findMany({
      where: { userId: user.id },
      include: {
        screen: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            trades: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error fetching paper trading runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paper trading runs' },
      { status: 500 }
    );
  }
}

// POST - Create a new paper trading run
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      screenId,
      runType,
      startDate,
      endDate,
      startingCapital,
      maxPositions,
      trailingStopPct,
    } = body;

    // Validation
    if (!name || !startDate || !startingCapital) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, startingCapital' },
        { status: 400 }
      );
    }

    // For historical runs, endDate is required
    if (runType === 'HISTORICAL' && !endDate) {
      return NextResponse.json(
        { error: 'Historical runs require an end date' },
        { status: 400 }
      );
    }

    // Create the run
    const run = await prisma.paperTradingRun.create({
      data: {
        userId: user.id,
        name,
        description,
        screenId: screenId || null,
        runType: runType || 'HISTORICAL',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        startingCapital: parseFloat(startingCapital),
        maxPositions: parseInt(maxPositions) || 5,
        trailingStopPct: parseFloat(trailingStopPct) || 15.0,
        status: 'RUNNING',
      },
      include: {
        screen: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If it's a historical backtest, run it immediately
    if (runType === 'HISTORICAL') {
      // Import the trading engine dynamically to avoid circular dependencies
      const { tradingEngine } = await import('@/lib/trading-engine');
      
      // Run the backtest in the background
      tradingEngine.runPaperTradingBacktest(run.id)
        .catch((error) => {
          console.error(`Error running backtest for run ${run.id}:`, error);
          // Mark as failed
          prisma.paperTradingRun.update({
            where: { id: run.id },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
            },
          }).catch(console.error);
        });
    }

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error('Error creating paper trading run:', error);
    return NextResponse.json(
      { error: 'Failed to create paper trading run' },
      { status: 500 }
    );
  }
}
