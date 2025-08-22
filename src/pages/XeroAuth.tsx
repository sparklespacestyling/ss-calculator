import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const XeroAuth: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  // Xero OAuth configuration
  const XERO_CLIENT_ID = import.meta.env.VITE_XERO_CLIENT_ID || 'B2B1A85588514CBB9570D33AA2C459BA';
  const REDIRECT_URI = `${window.location.origin}/ss-calculator/xero-auth`;
  const SCOPES = 'accounting.transactions.read accounting.contacts.read offline_access';
  const STATE = 'xero-oauth-state'; // Simple state for CSRF protection

  useEffect(() => {
    // Check if we're returning from Xero with an authorization code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const returnedState = urlParams.get('state');

    if (error) {
      setStatus('error');
      setMessage(`OAuth error: ${error}`);
      return;
    }

    if (code && returnedState === STATE) {
      handleAuthorizationCode(code);
    }
  }, []);

  const startOAuthFlow = () => {
    const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', XERO_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('state', STATE);
    authUrl.searchParams.append('prompt', 'login'); // Force fresh authorization

    // Redirect to Xero authorization
    window.location.href = authUrl.toString();
  };

  const handleAuthorizationCode = async (code: string) => {
    setStatus('loading');
    setMessage('Exchanging authorization code for access token...');

    try {
      // Use Supabase function to exchange authorization code for access token (avoids CORS issues)
      const tokenResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xero-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token exchange failed: ${errorData.error || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Token data received:', tokenData); // Debug logging
      
      const { access_token, refresh_token, expires_in } = tokenData;

      if (!access_token) {
        throw new Error('No access token received from Xero');
      }

      if (!refresh_token) {
        console.warn('No refresh token received - this might affect long-term functionality');
      }

      setAccessToken(access_token);
      setRefreshToken(refresh_token || '');
      setStatus('success');
      
      if (refresh_token) {
        setMessage(`Access token obtained successfully! Valid for ${expires_in} seconds.
        
IMPORTANT: Also copy the refresh token below - you'll need both tokens!`);
      } else {
        setMessage(`Access token obtained successfully! Valid for ${expires_in} seconds.
        
WARNING: No refresh token received. You may need to re-authorize when the access token expires.`);
      }

      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (error) {
      setStatus('error');
      setMessage(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(accessToken);
    setMessage('Access token copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Xero OAuth Setup
          </CardTitle>
          <CardDescription>
            Authorize your app to access Xero invoice data for webhook integration
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'idle' && (
            <>
              <Alert>
                <AlertDescription>
                  Click the button below to start the OAuth flow with Xero. You'll be redirected to Xero to authorize the application.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={startOAuthFlow}
                className="w-full"
                size="lg"
              >
                Authorize with Xero
              </Button>

              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Scopes requested:</strong></p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>accounting.transactions.read - To read invoice data</li>
                  <li>accounting.contacts.read - To read contact information</li>
                </ul>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Access Token (expires in 30 minutes):
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={accessToken}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(accessToken);
                        setMessage('Access token copied to clipboard!');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Refresh Token (lasts 60 days - KEEP THIS SECURE):
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={refreshToken}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(refreshToken);
                        setMessage('Refresh token copied to clipboard!');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Next steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                    <li>Copy both tokens above</li>
                    <li>Add to .env: XERO_ACCESS_TOKEN and XERO_REFRESH_TOKEN</li>
                    <li>Add both tokens to your Supabase secrets</li>
                    <li>The webhook will automatically refresh the access token when it expires</li>
                    <li>Test your Xero webhook integration</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                Return to Calculator
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {message}
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => {
                  setStatus('idle');
                  setMessage('');
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default XeroAuth;