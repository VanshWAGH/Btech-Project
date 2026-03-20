import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Activity, Users, ShieldAlert, BrainCircuit, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type AnalyticsResponse = {
  totalQueriesToday: number;
  avgRelevantDocs: number;
  activeTenants: number;
  knowledgeGapsCount: number;
  knowledgeGapsQueue: Array<{
    queryText: string;
    count: number;
    tenantName: string;
  }>;
};

export default function AnalyticsDashboard() {
  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics", { credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to load analytics");
      return res.json();
    },
  });

  const totalQueriesToday = data?.totalQueriesToday ?? 0;
  const avgRelevantDocs = data?.avgRelevantDocs ?? 0;
  const activeTenants = data?.activeTenants ?? 0;
  const knowledgeGapsCount = data?.knowledgeGapsCount ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Knowledge Operations
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor multi-tenant RAG performance and detect knowledge gaps using real database data.
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="glass rounded-xl p-6 border border-destructive/20 text-destructive">
            Failed to load analytics: {(error as any)?.message || "Unknown error"}
          </div>
        ) : (
          <>
            {/* Global Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass flex flex-col justify-center">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Queries Today</CardTitle>
                  <BarChart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalQueriesToday.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Based on query history</p>
                </CardContent>
              </Card>

              <Card className="glass flex flex-col justify-center">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Relevant Docs</CardTitle>
                  <BrainCircuit className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgRelevantDocs.toFixed(2)}</div>
                  <p className="text-xs text-emerald-400 mt-1">Average relevant docs per query</p>
                </CardContent>
              </Card>

              <Card className="glass flex flex-col justify-center">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeTenants}</div>
                  <p className="text-xs text-muted-foreground mt-1">Tenants in your system</p>
                </CardContent>
              </Card>

              <Card className="glass flex flex-col justify-center border-red-500/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-red-100">Knowledge Gaps</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">{knowledgeGapsCount}</div>
                  <p className="text-xs text-red-300 mt-1">Queries with no relevant docs</p>
                </CardContent>
              </Card>
            </div>

            {/* Knowledge Gap Queue */}
            <div className="mt-8">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Needs Documentation</CardTitle>
                  <CardDescription>
                    These questions frequently produce zero relevant documents (based on your DB query history).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(data?.knowledgeGapsQueue?.length ?? 0) === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No knowledge gaps detected in the last 7 days.
                      </div>
                    ) : (
                      data!.knowledgeGapsQueue.map((gap, i) => (
                        <div
                          key={`${gap.queryText}-${i}`}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-xl"
                        >
                          <div>
                            <h4 className="font-medium text-sm text-gray-200">"{gap.queryText}"</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested {gap.count} times from {gap.tenantName}
                            </p>
                          </div>
                          <button
                            disabled
                            className="mt-4 sm:mt-0 px-4 py-2 bg-primary/10 text-muted-foreground rounded-lg text-sm transition-colors border border-primary/10 cursor-not-allowed"
                            title="Draft generation not implemented for this step yet."
                          >
                            Generate Draft
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}