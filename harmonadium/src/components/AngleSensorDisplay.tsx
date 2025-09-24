'use client';

import React, { useState, useEffect } from 'react';
import { useLidAngleSensor } from '@/hooks/useLidAngleSensor';
import { useAngleStabilityDebounce } from '@/hooks/useDebounce';
import { getTargetTokenForAngle, MIN_VISIBLE_ANGLE, MAX_OPENING_ANGLE, DEBOUNCE_TIME_MS } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface AngleSensorDisplayProps {
  onAngleStable: (angle: number, targetToken: any, isStable: boolean) => void;
}

export function AngleSensorDisplay({ onAngleStable }: AngleSensorDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);

  const {
    currentAngle,
    isConnected,
    error,
    connect,
    disconnect,
    isSupported
  } = useLidAngleSensor();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { stableAngle, isStabilizing, countdown } = useAngleStabilityDebounce(
    (currentAngle !== null && currentAngle !== undefined && currentAngle >= MIN_VISIBLE_ANGLE) ? currentAngle : null,
    DEBOUNCE_TIME_MS
  );

  const targetToken = (currentAngle !== null && currentAngle !== undefined) ? getTargetTokenForAngle(currentAngle) : null;
  const stableTargetToken = stableAngle ? getTargetTokenForAngle(stableAngle) : null;

  const angleProgress = (currentAngle !== null && currentAngle !== undefined)
    ? Math.max(0, Math.min(100, ((currentAngle - MIN_VISIBLE_ANGLE) / (MAX_OPENING_ANGLE - MIN_VISIBLE_ANGLE)) * 100))
    : 0;

  React.useEffect(() => {
    // Always notify about current angle and stability status
    if (currentAngle !== null && currentAngle !== undefined && targetToken) {
      onAngleStable(currentAngle, targetToken, stableAngle !== null && !isStabilizing);
    }
  }, [currentAngle, targetToken, stableAngle, isStabilizing]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MacBook Lid Angle Sensor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading sensor...</div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          WebSocket not supported in this browser
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>MacBook Lid Angle Sensor</span>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={isConnected ? disconnect : connect}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Angle:</span>
              <span className="font-mono">
                {currentAngle !== null && currentAngle !== undefined ? `${currentAngle.toFixed(1)}°` : '--'}
              </span>
            </div>
            <Progress value={angleProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{MIN_VISIBLE_ANGLE}°</span>
              <span>{MAX_OPENING_ANGLE}°</span>
            </div>
          </div>

          {targetToken && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Target Token: {targetToken.symbol}</div>
                  <div className="text-sm text-muted-foreground">{targetToken.name}</div>
                </div>
                <Badge variant="outline">{targetToken.token}</Badge>
              </div>
            </div>
          )}

          {isStabilizing && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  Angle stabilizing... Swap will execute in:
                </div>
                <Badge variant="secondary">{countdown}s</Badge>
              </div>
            </div>
          )}

          {stableAngle && stableTargetToken && !isStabilizing && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm">
                ✅ Angle stable at {stableAngle.toFixed(1)}° → Ready to swap to {stableTargetToken.symbol}
              </div>
            </div>
          )}

          {(currentAngle !== null && currentAngle !== undefined && currentAngle < MIN_VISIBLE_ANGLE) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Angle too low ({currentAngle.toFixed(1)}°) - screen visibility compromised.
                Minimum angle: {MIN_VISIBLE_ANGLE}°
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}