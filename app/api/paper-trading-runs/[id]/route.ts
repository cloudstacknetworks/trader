
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get a single paper trading run with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const run = await prisma.paperTradingRun.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        screen: true,
        trades: {
          orderBy: { entryTime: 'desc' },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error('Error fetching paper trading run:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paper trading run' },
      { status: 500 }
    );
  }
}

// PUT - Update a paper trading run (mainly for stopping or adding notes)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { action, notes } = body;

    // Find the run
    const run = await prisma.paperTradingRun.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'stop') {
      // Can only stop running trades
      if (run.status !== 'RUNNING') {
        return NextResponse.json(
          { error: 'Can only stop runs that are currently running' },
          { status: 400 }
        );
      }

      // Calculate final results
      const trades = await prisma.trade.findMany({
        where: { paperTradingRunId: run.id },
      });

      const totalTrades = trades.length;
      const winningTrades = trades.filter((t: any) => (t.realizedPnl?.toNumber() || 0) > 0).length;
      const losingTrades = trades.filter((t: any) => (t.realizedPnl?.toNumber() || 0) <= 0).length;
      const totalReturnDollars = trades.reduce((sum: number, t: any) => sum + (t.realizedPnl?.toNumber() || 0), 0);
      const finalCapital = run.startingCapital.toNumber() + totalReturnDollars;
      const totalReturn = (totalReturnDollars / run.startingCapital.toNumber()) * 100;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const winningTradesData = trades.filter((t: any) => (t.realizedPnl?.toNumber() || 0) > 0);
      const losingTradesData = trades.filter((t: any) => (t.realizedPnl?.toNumber() || 0) < 0);
      const avgWinAmount = winningTradesData.length > 0
        ? winningTradesData.reduce((sum: number, t: any) => sum + (t.realizedPnl?.toNumber() || 0), 0) / winningTradesData.length
        : 0;
      const avgLossAmount = losingTradesData.length > 0
        ? losingTradesData.reduce((sum: number, t: any) => sum + (t.realizedPnl?.toNumber() || 0), 0) / losingTradesData.length
        : 0;

      const avgHoldTimeDays = totalTrades > 0
        ? trades.reduce((sum: number, t: any) => sum + ((t.holdTimeMinutes || 0) / (60 * 24)), 0) / totalTrades
        : 0;

      // Update the run
      const updatedRun = await prisma.paperTradingRun.update({
        where: { id: params.id },
        data: {
          status: 'STOPPED',
          endDate: new Date(),
          completedAt: new Date(),
          finalCapital,
          totalReturn,
          totalReturnDollars,
          totalTrades,
          winningTrades,
          losingTrades,
          winRate,
          avgWinAmount,
          avgLossAmount,
          avgHoldTimeDays,
        },
        include: {
          screen: true,
          trades: {
            orderBy: { entryTime: 'desc' },
          },
        },
      });

      return NextResponse.json({ run: updatedRun });
    } else if (action === 'update_notes') {
      // Update notes
      const updatedRun = await prisma.paperTradingRun.update({
        where: { id: params.id },
        data: { notes },
        include: {
          screen: true,
          trades: {
            orderBy: { entryTime: 'desc' },
          },
        },
      });

      return NextResponse.json({ run: updatedRun });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: stop, update_notes' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating paper trading run:', error);
    return NextResponse.json(
      { error: 'Failed to update paper trading run' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a paper trading run
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find and delete the run
    const run = await prisma.paperTradingRun.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Delete associated trades first
    await prisma.trade.deleteMany({
      where: { paperTradingRunId: params.id },
    });

    // Delete the run
    await prisma.paperTradingRun.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting paper trading run:', error);
    return NextResponse.json(
      { error: 'Failed to delete paper trading run' },
      { status: 500 }
    );
  }
}
