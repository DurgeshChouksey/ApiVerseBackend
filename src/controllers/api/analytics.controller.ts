import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";

//@DESC get traffic analytics for an api
//@route /api/v1/apis/:apiId/analytics/traffic
export const trafficAnalytics = async (c: Context) => {
  const prisma = getPrisma(c);
  const apiId = c.req.param("apiId");

  try {
    const days = parseInt(c.req.query("days") || "7", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all endpoint logs related to this API
    const logs = await prisma.endpointLog.findMany({
      where: {
        endpoint: { apiId },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        latency: true,
        success: true,
      },
    });

    if (!logs.length) {
      return c.json({
        totalCalls: 0,
        errorRate: 0,
        averageLatency: 0,
        data: [],
      });
    }

    const totalCalls = logs.length;
    const totalErrors = logs.filter((l) => !l.success).length;
    const averageLatency =
      logs.reduce((sum, log) => sum + (log.latency || 0), 0) / totalCalls;

    const dailyStats: Record<string, { calls: number; errors: number; latencies: number[] }> = {};

    logs.forEach((log) => {
      const date = log.createdAt.toISOString().split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { calls: 0, errors: 0, latencies: [] };
      }
      dailyStats[date].calls++;
      if (!log.success) dailyStats[date].errors++;
      dailyStats[date].latencies.push(log.latency || 0);
    });

    const data = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      calls: stats.calls,
      errors: stats.errors,
      latency: Math.round(
        stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length
      ),
    }));

    const response = {
      totalCalls,
      errorRate: Number(((totalErrors / totalCalls) * 100).toFixed(2)),
      averageLatency: Math.round(averageLatency),
      data: data.sort((a, b) => a.date.localeCompare(b.date)),
    };

    return c.json(response);
  } catch (err) {
    console.error("Traffic analytics error:", err);
    return c.json({ message: "Internal Server Error" }, 500);
  }
}


//@DESC get user analytics for an api
//@route /api/v1/apis/:apiId/analytics/users
export const userAnalytics = async (c: Context) => {
  const prisma = getPrisma(c);
  const apiId = c.req.param("apiId");

  try {
    const days = parseInt(c.req.query("days") || "7", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch endpoint logs for this API within the time range
    const logs = await prisma.endpointLog.findMany({
      where: {
        endpoint: { apiId },
        createdAt: { gte: startDate },
      },
      select: {
        userId: true,
        createdAt: true,
      },
    });

    if (!logs.length) {
      return c.json({
        activeUsers: 0,
        totalUsers: 0,
        data: [],
      });
    }

    // Count unique total users
    const uniqueUserIds = new Set(logs.map((log) => log.userId).filter(Boolean));
    const totalUsers = uniqueUserIds.size;

    // Count active users (last 24 hours)
    const activeSince = new Date();
    activeSince.setHours(activeSince.getHours() - 24);
    const activeUserIds = new Set(
      logs
        .filter((log) => log.createdAt >= activeSince)
        .map((log) => log.userId)
        .filter(Boolean)
    );
    const activeUsers = activeUserIds.size;

    // Aggregate users per day
    const dailyStats: Record<string, Set<string>> = {};
    logs.forEach((log) => {
      const date = log.createdAt.toISOString().split("T")[0];
      if (!dailyStats[date]) dailyStats[date] = new Set();
      if (log.userId) dailyStats[date].add(log.userId);
    });

    const data = Object.entries(dailyStats).map(([date, users]) => ({
      date,
      activeUsers: users.size,
    }));

    const response = {
      activeUsers,
      totalUsers,
      data: data.sort((a, b) => a.date.localeCompare(b.date)),
    };

    return c.json(response);
  } catch (err) {
    console.error("User analytics error:", err);
    return c.json({ message: "Internal Server Error" }, 500);
  }
};
