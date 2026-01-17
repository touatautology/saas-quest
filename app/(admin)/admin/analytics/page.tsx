import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  // GA4統合は環境変数の設定後に有効化
  const isConfigured = !!(
    process.env.GA4_PROPERTY_ID &&
    process.env.GA4_CLIENT_EMAIL &&
    process.env.GA4_PRIVATE_KEY
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Analytics
      </h1>

      {!isConfigured ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Google Analytics 4 Integration</CardTitle>
            </div>
            <CardDescription>
              Connect your Google Analytics 4 account to view analytics data here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Setup Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Create a Google Cloud service account with Analytics API access
                  </li>
                  <li>
                    Add the service account email to your GA4 property as a viewer
                  </li>
                  <li>
                    Set the following environment variables:
                    <ul className="list-disc list-inside ml-4 mt-1 font-mono text-xs">
                      <li>GA4_PROPERTY_ID</li>
                      <li>GA4_CLIENT_EMAIL</li>
                      <li>GA4_PRIVATE_KEY</li>
                    </ul>
                  </li>
                  <li>Restart the application</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Google Cloud Console
                  </Button>
                </a>
                <a
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Google Analytics
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* GA4データ表示（統合後に実装） */}
          <Card>
            <CardHeader>
              <CardTitle>Page Views</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Chart placeholder - GA4 integration coming soon
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">
                  Data will appear here after GA4 integration
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground">
                  Data will appear here after GA4 integration
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
