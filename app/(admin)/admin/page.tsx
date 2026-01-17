import { Suspense } from 'react';
import { requireAdmin, getAdminStats, getRecentActivity, getSubscriptionStats } from '@/lib/admin/queries';
import { StatsCard } from '@/components/admin/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, TrendingUp, Activity, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

async function StatsCards() {
  const stats = await getAdminStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Users"
        value={stats.totalUsers}
        icon={Users}
        description="Registered users"
      />
      <StatsCard
        title="Active Users"
        value={stats.activeUsers}
        icon={Activity}
        description="Last 7 days"
      />
      <StatsCard
        title="Total Quests"
        value={stats.totalQuests}
        icon={Swords}
        description="Available quests"
      />
      <StatsCard
        title="Completion Rate"
        value={`${stats.completionRate}%`}
        icon={TrendingUp}
        description="Quest completion"
      />
    </div>
  );
}

async function SubscriptionStatsCard() {
  const stats = await getSubscriptionStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Subscription Overview</CardTitle>
          </div>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Open Stripe Dashboard
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* プラン別 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">By Plan</h3>
            <div className="space-y-2">
              {Object.entries(stats.byPlan).length > 0 ? (
                Object.entries(stats.byPlan)
                  .sort((a, b) => b[1] - a[1])
                  .map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <Badge
                        className={
                          plan === 'Free'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-purple-100 text-purple-800'
                        }
                      >
                        {plan}
                      </Badge>
                      <span className="font-medium">{count} teams</span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">No subscription data</p>
              )}
            </div>
          </div>

          {/* ステータス別 */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">By Status</h3>
            <div className="space-y-2">
              {Object.entries(stats.byStatus).length > 0 ? (
                Object.entries(stats.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          status === 'active'
                            ? 'text-green-600 border-green-300'
                            : status === 'trialing'
                            ? 'text-blue-600 border-blue-300'
                            : status === 'canceled'
                            ? 'text-red-600 border-red-300'
                            : 'text-gray-500 border-gray-300'
                        }
                      >
                        {status}
                      </Badge>
                      <span className="font-medium">{count} teams</span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">No subscription data</p>
              )}
            </div>
          </div>
        </div>

        {/* サマリー */}
        <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</p>
            <p className="text-sm text-muted-foreground">Active Subscriptions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Teams</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function RecentActivityList() {
  const activities = await getRecentActivity(10);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      SIGN_UP: 'signed up',
      SIGN_IN: 'signed in',
      SIGN_OUT: 'signed out',
      UPDATE_PASSWORD: 'updated password',
      UPDATE_ACCOUNT: 'updated account',
      QUEST_COMPLETED: 'completed quest',
    };
    return labels[action] || action;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {activity.userName || activity.userEmail || 'Unknown user'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getActionLabel(activity.action)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(
                    activity.timestamp instanceof Date
                      ? activity.timestamp
                      : new Date(activity.timestamp),
                    {
                      addSuffix: true,
                      locale: ja,
                    }
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <StatsCards />
        </Suspense>

        <div className="grid lg:grid-cols-2 gap-6">
          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            }
          >
            <SubscriptionStatsCard />
          </Suspense>

          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            }
          >
            <RecentActivityList />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
