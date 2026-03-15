import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Activity, BrainCircuit, Users, ShieldAlert } from "lucide-react";

export default function AnalyticsDashboard() {
    return (
        <AppLayout>
            <div className="space-y-6">
                <header className="mb-8">
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary" />
                        Knowledge Operations
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor multi-tenant RAG performance, detect knowledge gaps, and review access metrics.
                    </p>
                </header>

                {/* Global Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="glass flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Queries Today</CardTitle>
                            <BarChart className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">14,249</div>
                            <p className="text-xs text-muted-foreground mt-1">+12.5% from yesterday</p>
                        </CardContent>
                    </Card>

                    <Card className="glass flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg Query Latency</CardTitle>
                            <BrainCircuit className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">428ms</div>
                            <p className="text-xs text-emerald-400 mt-1">GPT-4o Mini (78%), Claude (22%)</p>
                        </CardContent>
                    </Card>

                    <Card className="glass flex flex-col justify-center">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                            <Users className="h-4 w-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">24</div>
                            <p className="text-xs text-muted-foreground mt-1">Colleges & Departments</p>
                        </CardContent>
                    </Card>

                    <Card className="glass flex flex-col justify-center border-red-500/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-red-100">Knowledge Gaps</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-red-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-400">12</div>
                            <p className="text-xs text-red-300 mt-1">High-frequency unanswered questions</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Knowledge Gap Queue */}
                <div className="mt-8">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Needs Documentation</CardTitle>
                            <CardDescription>
                                System detected queries with relevance &lt; 0.7. Generating draft docs automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { text: 'When is the add/drop deadline for Spring 2026?', count: 142, tenant: 'Registrar' },
                                    { text: 'How do I access the specialized HPC cluster for genome research?', count: 38, tenant: 'Bioinformatics Dept' },
                                    { text: 'What is the updated policy for remote work travel reimbursement?', count: 21, tenant: 'HR Admin' }
                                ].map((gap, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-xl">
                                        <div>
                                            <h4 className="font-medium text-sm text-gray-200">"{gap.text}"</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Requested {gap.count} times from {gap.tenant}</p>
                                        </div>
                                        <button className="mt-4 sm:mt-0 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary hover:text-white rounded-lg text-sm transition-colors border border-primary/20">
                                            Generate Draft
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}
