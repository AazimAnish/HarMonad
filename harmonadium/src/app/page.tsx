'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AngleSensorDisplay } from '@/components/AngleSensorDisplay';
import { AutoSwapInterface } from '@/components/AutoSwapInterface';
import { TokenBalanceDisplay } from '@/components/TokenBalanceDisplay';
import { SwapCountdownDisplay } from '@/components/SwapCountdownDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ANGLE_TO_TOKEN_MAPPING, MIN_VISIBLE_ANGLE, MAX_OPENING_ANGLE, MONAD_TESTNET_TOKENS } from '@/lib/config';
import { useAngleStabilityDebounce } from '@/hooks/useDebounce';
import { Settings, Info, Coins } from 'lucide-react';
import { ethers } from 'ethers';

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
  const [targetToken, setTargetToken] = useState<typeof MONAD_TESTNET_TOKENS[keyof typeof MONAD_TESTNET_TOKENS] | null>(null);
  const [isStableAngle, setIsStableAngle] = useState(false);
  const [swapHistory, setSwapHistory] = useState<SwapEvent[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Get the debounce countdown for display
  const { stableAngle, isStabilizing, countdown } = useAngleStabilityDebounce(
    (currentAngle !== null && currentAngle !== undefined && currentAngle >= MIN_VISIBLE_ANGLE) ? currentAngle : null,
    3000 // 3 second countdown
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle live angle updates (for real-time card selection)
  const handleAngleUpdate = useCallback((angle: number, targetToken: {
    token: string;
    address: string;
    name: string;
    symbol: string;
  } | null) => {
    setCurrentAngle(angle);
    // Convert the simplified token object to our full token structure
    if (targetToken) {
      const fullToken = Object.values(MONAD_TESTNET_TOKENS).find(t => t.symbol === targetToken.symbol);
      setTargetToken(fullToken || null);
    } else {
      setTargetToken(null);
    }
  }, []);

  // Handle stable angle (for swap execution)
  const handleAngleStable = useCallback((angle: number, targetToken: {
    token: string;
    address: string;
    name: string;
    symbol: string;
  } | null, isStable: boolean) => {
    // Update stable angle state
    setIsStableAngle(isStable);
    
    // Also update live angle state to ensure consistency
    handleAngleUpdate(angle, targetToken);
  }, [handleAngleUpdate]);

  const handleSwapComplete = useCallback((success: boolean, txHash?: string) => {
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

      // Refresh token balances after swap
      setBalanceRefreshTrigger(prev => prev + 1);
    }
  }, [currentAngle, targetToken]);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover -z-10 transition-opacity duration-1000"
        src="/bgMonad.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      
      {/* Overlay for better content readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/30 -z-5"></div>
      
      {/* Main content with backdrop */}
      <div className="relative z-10 min-h-screen bg-gradient-to-br from-white/85 to-gray-100/85 backdrop-blur-md animate-in fade-in duration-1000">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8 animate-in slide-in-from-top duration-1000">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Harmonad.png"
              alt="Harmonadium Logo"
              className="h-12 w-auto transform hover:scale-110 transition-transform duration-300"
            />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Harmonadium
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Revolutionary DeFi trading controlled by your MacBook&apos;s lid angle.
            Sign once, then automatically swap tokens based on your screen angle.
          </p>
        </header>

        {/* Swap Countdown (shows during stabilization) */}
        {isStabilizing && currentAngle !== null && targetToken && (
          <div className="mb-6 animate-in slide-in-from-top duration-500">
            <SwapCountdownDisplay
              countdown={countdown}
              angle={currentAngle}
              sellAmount={ethers.parseEther('0.01').toString()}
              userAddress={undefined} // Will be passed from AutoSwapInterface if needed
              isActive={true}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-in slide-in-from-bottom duration-1000 delay-300">
          <div className="transform hover:scale-[1.02] transition-transform duration-300">
            <AngleSensorDisplay 
              onAngleUpdate={handleAngleUpdate}
              onAngleStable={handleAngleStable} 
              videoRef={videoRef} 
            />
          </div>
          <div className="transform hover:scale-[1.02] transition-transform duration-300">
            <AutoSwapInterface
              targetToken={targetToken ? {
                token: targetToken.symbol,
                address: targetToken.address,
                name: targetToken.name,
                symbol: targetToken.symbol
              } : undefined}
              angle={currentAngle}
              isStableAngle={isStableAngle}
              onAutoSwapExecuted={handleSwapComplete}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-1000 delay-500">
          {/* Token Balance Display */}
          <div className="transform hover:scale-[1.02] transition-transform duration-300">
            <TokenBalanceDisplay
              refreshTrigger={balanceRefreshTrigger}
              showSwapPairs={true}
              highlightToken={targetToken?.symbol}
            />
          </div>

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
                      className={`p-3 rounded-lg border transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 ring-2 ring-blue-400 shadow-lg transform scale-105'
                          : 'bg-secondary/50 hover:bg-secondary/70'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className={`font-medium ${isActive ? 'text-blue-700' : ''}`}>
                            {token.symbol}
                            {isActive && <span className="ml-2 text-xs">🎯 ACTIVE</span>}
                          </div>
                          <div className={`text-sm ${isActive ? 'text-blue-600' : 'text-muted-foreground'}`}>
                            {range}°
                            {isActive && currentAngle && (
                              <span className="ml-2 font-medium">
                                (Current: {currentAngle.toFixed(1)}°)
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'animate-pulse' : ''}>
                          {token.symbol}
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
    </div>
  );
}