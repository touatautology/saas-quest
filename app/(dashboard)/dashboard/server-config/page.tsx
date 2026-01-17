'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Server,
  Key,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ServerConfigData = {
  serverUrl: string | null;
  hasToken: boolean;
  tokenCreatedAt: string | null;
};

export default function ServerConfigPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Server Configuration
      </h1>
      <div className="space-y-6">
        <ServerUrlCard />
        <VerificationTokenCard />
        <TemplateCodeCard />
      </div>
    </section>
  );
}

function ServerUrlCard() {
  const { data, isLoading } = useSWR<ServerConfigData>('/api/user/server-config', fetcher);
  const [serverUrl, setServerUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 初期値を設定
  useState(() => {
    if (data?.serverUrl) {
      setServerUrl(data.serverUrl);
    }
  });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/server-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Server URL saved successfully' });
        mutate('/api/user/server-config');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save server URL' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const urlToTest = serverUrl || data?.serverUrl;
    if (!urlToTest) {
      setTestResult({ success: false, message: 'Please enter a server URL first' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/user/server-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: urlToTest }),
      });
      const result = await res.json();
      setTestResult({ success: result.success, message: result.message });
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server URL
        </CardTitle>
        <CardDescription>
          Enter the URL of your deployed SaaS server. This is where SaaS Quest will verify your server configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="serverUrl">Server URL</Label>
          <div className="flex gap-2">
            <Input
              id="serverUrl"
              type="url"
              placeholder="https://your-saas.vercel.app"
              value={serverUrl || data?.serverUrl || ''}
              onChange={(e) => setServerUrl(e.target.value)}
            />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Must use HTTPS (except for localhost during development)
          </p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          {testResult && (
            <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {testResult.message}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Connection test checks reachability only. Full verification runs during server_status quests.
        </p>
      </CardContent>
    </Card>
  );
}

function VerificationTokenCard() {
  const { data, isLoading } = useSWR<ServerConfigData>('/api/user/server-config', fetcher);
  const [generating, setGenerating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateToken = async () => {
    setGenerating(true);
    setNewToken(null);
    try {
      const res = await fetch('/api/user/server-config/token', {
        method: 'POST',
      });
      const result = await res.json();
      if (res.ok) {
        setNewToken(result.token);
        mutate('/api/user/server-config');
      }
    } catch {
      // Error handling
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Verification Token
        </CardTitle>
        <CardDescription>
          This token is used to authenticate requests between SaaS Quest and your server.
          Add it to your server&apos;s environment variables as <code className="bg-muted px-1 rounded">SAAS_QUEST_VERIFICATION_TOKEN</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.hasToken && !newToken && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm">
              Token generated on {data.tokenCreatedAt ? new Date(data.tokenCreatedAt).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
        )}

        {newToken && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="space-y-2">
              <p className="font-medium text-amber-800">Save this token now - it won&apos;t be shown again!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white p-2 rounded border text-xs break-all">
                  {newToken}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleGenerateToken} disabled={generating} variant={data?.hasToken ? 'outline' : 'default'}>
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {data?.hasToken ? 'Regenerate Token' : 'Generate Token'}
        </Button>

        {data?.hasToken && !newToken && (
          <p className="text-xs text-muted-foreground">
            Regenerating will invalidate the previous token. Make sure to update your server&apos;s environment variables.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TemplateCodeCard() {
  const [copied, setCopied] = useState(false);

  const templateCode = `// app/api/saas-quest/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const TOKEN = process.env.SAAS_QUEST_VERIFICATION_TOKEN!;

export async function POST(request: NextRequest) {
  // 1. Verify incoming signature
  const signature = request.headers.get('X-SaaS-Quest-Signature');
  const timestamp = request.headers.get('X-SaaS-Quest-Timestamp');
  const nonce = request.headers.get('X-SaaS-Quest-Nonce');

  if (!signature || !timestamp || !nonce) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
  }

  // Check timestamp freshness (5 minute window)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return NextResponse.json({ error: 'Request expired' }, { status: 401 });
  }

  const body = await request.json();
  const expected = crypto
    .createHmac('sha256', TOKEN)
    .update(\`\${timestamp}.\${nonce}.\${JSON.stringify(body)}\`)
    .digest('hex');

  if (signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Collect status information
  const status = {
    server: true,
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    database_connected: await checkDatabase(),
    // Add more checks as needed
  };

  // 3. Generate response signature
  const resTimestamp = Math.floor(Date.now() / 1000);
  const resSignature = crypto
    .createHmac('sha256', TOKEN)
    .update(\`\${resTimestamp}.\${JSON.stringify(status)}\`)
    .digest('hex');

  return NextResponse.json({
    status: 'ok',
    timestamp: resTimestamp,
    data: status,
    signature: resSignature,
  });
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Implement your database health check
    return true;
  } catch {
    return false;
  }
}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(templateCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Implementation Template
        </CardTitle>
        <CardDescription>
          Add this endpoint to your server to enable verification. This code should be placed at{' '}
          <code className="bg-muted px-1 rounded">/api/saas-quest/status</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96">
            <code>{templateCode}</code>
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            <strong>Environment Variable:</strong> Don&apos;t forget to add{' '}
            <code className="bg-muted px-1 rounded">SAAS_QUEST_VERIFICATION_TOKEN</code>{' '}
            to your server&apos;s environment variables with the token generated above.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
