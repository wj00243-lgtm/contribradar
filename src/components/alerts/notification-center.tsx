"use client";

import { useEffect, useState } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";

import { ProGate } from "@/components/pro/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AlertItem = {
  id: string;
  type: "new_issue" | "score_change" | "stale_reminder";
  message: string;
  reasonText: string;
  isRead: boolean;
  createdAt?: string;
};

type AlertsResponse = {
  alerts: AlertItem[];
  unreadCount: number;
};

type NotificationCenterProps = {
  userPlan?: string | null;
};

export function NotificationCenter({ userPlan }: NotificationCenterProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function loadAlerts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/alerts");
      const body = await response.json();

      if (!response.ok) {
        setError(body.error?.message ?? "Alerts could not be loaded.");
        return;
      }

      const payload = body as AlertsResponse;
      setAlerts(payload.alerts);
      setUnreadCount(payload.unreadCount);
    } catch {
      setError("Alerts could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  async function checkAlerts() {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/alerts", { method: "POST" });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error?.message ?? "Smart alerts could not be checked.");
        return;
      }

      await loadAlerts();
    } catch {
      setError("Smart alerts could not be checked.");
    } finally {
      setIsChecking(false);
    }
  }

  async function markRead(alertId: string) {
    const response = await fetch(`/api/v1/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true })
    });

    if (response.ok) {
      setAlerts((current) => current.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)));
      setUnreadCount((current) => Math.max(current - 1, 0));
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  return (
    <ProGate featureName="smartAlerts" userPlan={userPlan}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-emerald-300" />
                Notification center
              </CardTitle>
              <CardDescription>Smart alerts from watchlists, score changes, and stale issues.</CardDescription>
            </div>
            <Badge variant={unreadCount > 0 ? "default" : "outline"}>{unreadCount}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={isLoading} onClick={loadAlerts} size="sm" type="button" variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button disabled={isChecking} onClick={checkAlerts} size="sm" type="button">
              {isChecking ? "Checking..." : "Check alerts"}
            </Button>
          </div>

          {error ? <p className="mt-3 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

          <div className="mt-4 space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-zinc-500">{isLoading ? "Loading alerts..." : "No alerts yet."}</p>
            ) : (
              alerts.map((alert) => (
                <article key={alert.id} className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant={alert.isRead ? "outline" : "secondary"}>{alert.type.replace("_", " ")}</Badge>
                      <h3 className="mt-2 text-sm font-semibold text-white">{alert.message}</h3>
                    </div>
                    {!alert.isRead ? (
                      <Button onClick={() => void markRead(alert.id)} size="icon" type="button" variant="ghost">
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Mark read</span>
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-5 text-zinc-400">{alert.reasonText}</p>
                </article>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </ProGate>
  );
}
