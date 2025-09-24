'use client';

import { useState, useEffect } from 'react';
import { AngleSensorDisplay } from '@/components/AngleSensorDisplay';
import { AutoSwapInterface } from '@/components/AutoSwapInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ANGLE_TO_TOKEN_MAPPING, MIN_VISIBLE_ANGLE, MAX_OPENING_ANGLE } from '@/lib/config';
import { Settings, Info, Laptop } from 'lucide-react';

interface SwapEvent {
  id: string;
  timestamp: number;
  angle: number;
  token: string;
  success: boolean;
  txHash?: string;
}

export default function Home() {
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [targetToken, setTargetToken] = useState<any>(null);
  const [isStableAngle, setIsStableAngle] = useState(false);
  const [swapHistory, setSwapHistory] = useState<SwapEvent[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAngleStable = (angle: number, token: any, isStable: boolean) => {
    setCurrentAngle(angle);
    setTargetToken(token);
    setIsStableAngle(isStable);
  };

  const handleSwapComplete = (success: boolean, txHash?: string) => {
    if (currentAngle && targetToken) {
      const swapEvent: SwapEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        angle: currentAngle,
        token: targetToken.symbol,
        success,
        txHash,
      };

      setSwapHistory(prev => [swapEvent, ...prev.slice(0, 9)]);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">LidAngle DeFi</h1>
            <p>Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Laptop className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              LidAngle DeFi
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Revolutionary DeFi trading controlled by your MacBook's lid angle.
            Sign once, then automatically swap tokens based on your screen angle.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AngleSensorDisplay onAngleStable={handleAngleStable} />
          <AutoSwapInterface
            targetToken={targetToken}
            angle={currentAngle}
            isStableAngle={isStableAngle}
            onAutoSwapExecuted={handleSwapComplete}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Angle Mapping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(ANGLE_TO_TOKEN_MAPPING).map(([range, token]) => {
                  const [min, max] = range.split('-').map(Number);
                  const isActive = currentAngle && currentAngle >= min && currentAngle <= max;

                  return (
                    <div
                      key={range}
                      className={`p-3 rounded-lg border ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-400'
                          : 'bg-secondary/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{token.symbol}</div>
                          <div className="text-sm text-muted-foreground">{range}°</div>
                        </div>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {token.token}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Minimum Angle:</span>
                  <Badge variant="outline">{MIN_VISIBLE_ANGLE}°</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Maximum Angle:</span>
                  <Badge variant="outline">{MAX_OPENING_ANGLE}°</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Debounce Time:</span>
                  <Badge variant="outline">3.0s</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Network:</span>
                  <Badge variant="outline">Monad Testnet</Badge>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>How it works:</strong><br />
                  1. Connect wallet & authorize once<br />
                  2. Adjust your MacBook lid angle<br />
                  3. Wait 3 seconds for stabilization<br />
                  4. Automatic swap executes (no manual approval)<br />
                  5. View transaction on explorer
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Swap History</CardTitle>
            </CardHeader>
            <CardContent>
              {swapHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No swaps yet. Adjust your lid angle to start trading!
                </div>
              ) : (
                <div className="space-y-2">
                  {swapHistory.map((swap) => (
                    <div key={swap.id} className="p-2 rounded border text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {swap.angle.toFixed(1)}° → {swap.token}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(swap.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge variant={swap.success ? 'secondary' : 'destructive'}>
                          {swap.success ? '✓' : '✗'}
                        </Badge>
                      </div>
                      {swap.txHash && (
                        <div className="text-xs font-mono text-muted-foreground mt-1 truncate">
                          {swap.txHash}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            Built with Next.js, MetaMask Delegation Toolkit, and 0x Protocol on Monad Testnet
          </p>
          <p className="mt-1">
            Ensure your MacBook Air M3 lid angle sensor is supported and WebSocket server is running
          </p>
        </footer>
      </div>
    </div>
  );
}