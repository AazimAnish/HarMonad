'use client';

import { useState, useEffect } from 'react';
import { useMetaMaskSDK } from '@/hooks/useMetaMaskSDK';
import { useAutoSwap } from '@/hooks/useAutoSwap';
import { MONAD_TESTNET_CONFIG } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Wallet, Power, CheckCircle, XCircle, Clock, AlertCircle, Zap, Shield } from 'lucide-react';

interface AutoSwapInterfaceProps {
  targetToken?: {
    token: string;
    address: string;
    name: string;
    symbol: string;
  };
  angle?: number | null;
  isStableAngle: boolean;
  onAutoSwapExecuted?: (success: boolean, txHash?: string) => void;
}

export function AutoSwapInterface({
  targetToken,
  angle,
  isStableAngle,
  onAutoSwapExecuted
}: AutoSwapInterfaceProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);

  const {
    account,
    isConnected,
    isConnecting,
    error: metaMaskError,
    connect,
    disconnect,
    switchToMonadTestnet,
    sendTransaction,
    requestSwapAuthorization,
    isAuthorizedForSwaps,
    authorizationStatus
  } = useMetaMaskSDK();

  const { isEnabled, lastSwap, swapHistory, executeSwap } = useAutoSwap();

  const isOnMonadTestnet = account?.chainId === MONAD_TESTNET_CONFIG.chainId;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-execute swap when angle is stable and authorized
  useEffect(() => {
    if (
      isStableAngle &&
      targetToken &&
      angle !== null &&
      angle !== undefined &&
      isAuthorizedForSwaps &&
      account &&
      isOnMonadTestnet &&
      !isExecutingSwap
    ) {
      handleAutoSwap();
    }
  }, [isStableAngle, targetToken, angle, isAuthorizedForSwaps, account, isOnMonadTestnet, isExecutingSwap]);

  const handleAutoSwap = async () => {
    if (!account || !targetToken || angle === null || angle === undefined) return;

    setIsExecutingSwap(true);
    console.log(`🚀 Auto-executing swap for ${angle}° → ${targetToken.symbol}`);

    try {
      const result = await executeSwap(angle, account.address, sendTransaction);
      onAutoSwapExecuted?.(result.success, result.txHash);
    } catch (error) {
      console.error('Auto-swap execution failed:', error);
      onAutoSwapExecuted?.(false);
    } finally {
      setIsExecutingSwap(false);
    }
  };

  const handleAuthorize = async () => {
    try {
      await requestSwapAuthorization();
    } catch (error) {
      console.error('Authorization failed:', error);
    }
  };

  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auto-Swap Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading interface...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Auto-Swap Interface
          {isEnabled && <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metaMaskError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{metaMaskError}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="p-6 border-2 border-dashed rounded-lg">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect MetaMask to enable automatic angle-based token swapping
              </p>
              <Button
                onClick={connect}
                disabled={isConnecting}
                size="lg"
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Status */}
            <div className="p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Connected Wallet:</span>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    <Wallet className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnect}
                  >
                    <Power className="h-3 w-3 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
              <div className="font-mono text-sm break-all">{account.address}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Balance: {parseFloat(account.balance).toFixed(4)} MON
              </div>
            </div>

            {!isOnMonadTestnet && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Switch to Monad Testnet to enable automatic swaps.
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={switchToMonadTestnet}
                  >
                    Switch Network
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Authorization Status */}
            {isOnMonadTestnet && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Auto-Swap Authorization</span>
                  </div>
                  {isAuthorizedForSwaps ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Authorized
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Authorized
                    </Badge>
                  )}
                </div>

                {!isAuthorizedForSwaps ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sign once to enable automatic swaps based on your lid angle.
                      No manual approval needed for each transaction.
                    </p>
                    <Button onClick={handleAuthorize} className="w-full">
                      <Shield className="h-4 w-4 mr-2" />
                      Authorize Automatic Swaps
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p className="text-green-600">
                      ✅ Automatic swaps enabled for up to 0.1 MON per transaction
                    </p>
                    {authorizationStatus?.validUntil && (
                      <p className="text-muted-foreground">
                        Valid until: {new Date(authorizationStatus.validUntil * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Current Swap Status */}
            {angle !== null && angle !== undefined && targetToken && isAuthorizedForSwaps && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <strong>{angle.toFixed(1)}° → {targetToken.symbol}</strong>
                  </div>
                  {isStableAngle && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {isExecutingSwap ? 'Executing...' : 'Ready'}
                    </Badge>
                  )}
                </div>
                {isExecutingSwap && (
                  <div className="space-y-2">
                    <Progress value={undefined} className="h-1" />
                    <div className="text-xs text-center text-blue-600">
                      Executing automatic swap to {targetToken.symbol}...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Swap History */}
            {swapHistory.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent Auto-Swaps</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {swapHistory.slice(0, 5).map((swap, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-secondary/30 rounded text-xs">
                      <div>
                        {swap.angle.toFixed(1)}° → {swap.token}
                      </div>
                      <div className="flex items-center gap-2">
                        {swap.success ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-2 w-2 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="h-2 w-2 mr-1" />
                            Failed
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          {new Date(swap.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}