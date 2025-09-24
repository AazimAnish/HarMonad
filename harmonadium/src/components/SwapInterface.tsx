'use client';

import { useState, useEffect } from 'react';
import { useMetaMaskSDK } from '@/hooks/useMetaMaskSDK';
import { mockSwapService, createMockSwapTransaction } from '@/lib/mockSwap';
import { MONAD_TESTNET_CONFIG } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Wallet, ArrowRightLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface SwapInterfaceProps {
  targetToken?: {
    token: string;
    address: string;
    name: string;
    symbol: string;
  };
  angle?: number;
  onSwapComplete?: (success: boolean, txHash?: string) => void;
}

type SwapStatus = 'idle' | 'connecting' | 'preparing' | 'signing' | 'executing' | 'success' | 'error';

export function SwapInterface({ targetToken, angle, onSwapComplete }: SwapInterfaceProps) {
  const [isMounted, setIsMounted] = useState(false);

  const {
    account,
    isConnected,
    isConnecting,
    error: metaMaskError,
    connect,
    switchToMonadTestnet,
    sendTransaction
  } = useMetaMaskSDK();

  const [swapStatus, setSwapStatus] = useState<SwapStatus>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [monadAmount, setMonadAmount] = useState('0.01');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isOnMonadTestnet = account?.chainId === MONAD_TESTNET_CONFIG.chainId;

  const executeSwap = async () => {
    if (!account || !targetToken || !isConnected) return;

    try {
      setSwapStatus('preparing');
      setSwapError(null);
      setTxHash(null);

      const sellAmount = (parseFloat(monadAmount) * 1e18).toString();

      console.log('Getting swap quote for:', {
        targetToken: targetToken.address,
        sellAmount,
        account: account.address
      });

      const quote = await mockSwapService.swapMonadToToken(
        targetToken.address,
        sellAmount,
        account.address
      );

      console.log('Received swap quote:', quote);

      setSwapStatus('signing');

      const transaction = createMockSwapTransaction(quote, account.address);

      console.log('Created transaction:', transaction);

      setSwapStatus('executing');

      const hash = await sendTransaction(transaction);
      setTxHash(hash);
      setSwapStatus('success');

      onSwapComplete?.(true, hash);
    } catch (error: any) {
      console.error('Swap failed:', error);
      setSwapError(error.message || 'Swap failed');
      setSwapStatus('error');
      onSwapComplete?.(false);
    }
  };

  const handleConnect = async () => {
    setSwapStatus('connecting');
    try {
      await connect();
      if (!isOnMonadTestnet) {
        await switchToMonadTestnet();
      }
      setSwapStatus('idle');
    } catch (error) {
      setSwapStatus('error');
    }
  };

  const getStatusDisplay = () => {
    switch (swapStatus) {
      case 'connecting':
        return { icon: Clock, text: 'Connecting to MetaMask...', variant: 'secondary' as const };
      case 'preparing':
        return { icon: Clock, text: 'Preparing swap...', variant: 'secondary' as const };
      case 'signing':
        return { icon: Clock, text: 'Sign transaction in MetaMask', variant: 'secondary' as const };
      case 'executing':
        return { icon: Clock, text: 'Executing swap...', variant: 'secondary' as const };
      case 'success':
        return { icon: CheckCircle, text: 'Swap completed!', variant: 'secondary' as const };
      case 'error':
        return { icon: XCircle, text: 'Swap failed', variant: 'destructive' as const };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Swap Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading swap interface...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Token Swap Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metaMaskError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{metaMaskError}</AlertDescription>
          </Alert>
        )}

        {swapError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{swapError}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Connect your MetaMask wallet to start swapping</p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || swapStatus === 'connecting'}
              className="w-full"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnecting || swapStatus === 'connecting' ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Connected Account:</span>
                <Badge variant="secondary">
                  <Wallet className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
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
                  Please switch to Monad Testnet to proceed with swaps.
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

            {angle !== undefined && angle !== null && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm">
                  <strong>Current Lid Angle:</strong> {angle.toFixed(1)}°
                </div>
              </div>
            )}

            {targetToken && (
              <div className="p-4 border border-dashed rounded-lg">
                <div className="text-center space-y-2">
                  <div className="text-lg font-semibold">
                    {monadAmount} MON → {targetToken.symbol}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Swap to {targetToken.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {targetToken.address}
                  </div>
                </div>
              </div>
            )}

            {statusDisplay && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <statusDisplay.icon className="h-4 w-4" />
                <span className="text-sm">{statusDisplay.text}</span>
              </div>
            )}

            {swapStatus === 'executing' && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2" />
                <div className="text-xs text-center text-muted-foreground">
                  Transaction submitted, waiting for confirmation...
                </div>
              </div>
            )}

            {txHash && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm">
                  <strong>Transaction Hash:</strong>
                  <div className="font-mono text-xs break-all mt-1">{txHash}</div>
                  <a
                    href={`${MONAD_TESTNET_CONFIG.blockExplorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    View on Explorer →
                  </a>
                </div>
              </div>
            )}

            <Button
              onClick={executeSwap}
              disabled={
                !targetToken ||
                !isOnMonadTestnet ||
                ['preparing', 'signing', 'executing'].includes(swapStatus)
              }
              className="w-full"
            >
              {swapStatus === 'executing' ? (
                'Swapping...'
              ) : targetToken ? (
                `Swap to ${targetToken.symbol}`
              ) : (
                'Adjust lid angle to select token'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}