import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { useCreateQuery, useQueries } from "@/hooks/use-queries";
import { ProcessedQueryResponse } from "@shared/schema";
import { Search, Loader2, Bot, Megaphone, FileText, CornerDownLeft, ClipboardList } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [queryInput, setQueryInput] = useState("");
  const [activeResult, setActiveResult] = useState<ProcessedQueryResponse | null>(null);
  
  const { data: history = [] } = useQueries();
  const createQuery = useCreateQuery();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || createQuery.isPending) return;

    createQuery.mutate({ query: queryInput }, {
      onSuccess: (data) => {
        setActiveResult(data);
        setQueryInput("");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-scroll to bottom of results
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeResult, createQuery.isPending]);

  return (
    <AppLayout>
      <div className="w-full max-w-full pb-10">
        
        {/* Header section matching Moodle Dashboard */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-[2rem] font-light text-[#212529] mb-0 tracking-tight">Dashboard</h1>
            <div className="text-sm font-medium text-primary hover:underline cursor-pointer inline-block mt-1">Dashboard</div>
          </div>
          <button className="bg-[#e9ecef] text-[#495057] px-4 py-1.5 text-sm rounded border border-[#dee2e6] hover:bg-[#dde0e3] transition-colors mt-2">
            Customise this page
          </button>
        </div>

        <h2 className="text-2xl font-light text-[#212529] mb-6">
          Welcome back, {user?.id && user?.firstName ? `${user.id}_${user.firstName.toUpperCase()}` : "User"}! 👋
        </h2>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Content Column */}
          <div className="flex-1 w-full space-y-6">
            
            {/* Feedback Alert Block */}
            <div className="bg-[#cce5ff] text-[#004085] p-3 rounded border border-[#b8daff] flex gap-3 items-start text-sm pr-10 relative">
              <Megaphone className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
              <div>
                <div className="mb-1">The creators of this software would like your feedback.</div>
                <div>
                  <span className="font-bold text-[#004085] cursor-pointer hover:underline">Give feedback about this software ↗</span> 
                  <span className="mx-2 font-bold opacity-30">|</span> 
                  <span className="font-bold text-[#004085] cursor-pointer hover:underline">Remind me later</span>
                </div>
              </div>
            </div>

            {/* Error/Notice Block modeled after Moodle's unsupported warning */}
            <div className="bg-white p-4 rounded border border-[#dee2e6] text-[15px]">
              <p className="text-[#212529] mb-2 leading-relaxed">This site is fully supported and functioning ideally.</p>
              <p className="text-red-600 font-bold leading-relaxed">
                Notice: Your multi-tenant RAG system is active and operating securely across your isolated vault. The integrity of your documents and query results is assured.
              </p>
            </div>

            {/* NexusRAG Query Block - "Course overview" equivalent */}
            <div className="bg-white border border-[#dee2e6] rounded">
              <div className="px-4 py-3 border-b border-[#dee2e6] bg-transparent">
                <h3 className="font-normal text-lg text-[#212529]">NexusRAG Engine</h3>
              </div>
              
              <div className="p-4">
                {/* Result Area */}
                <div className="min-h-[200px] max-h-[400px] overflow-y-auto mb-4 bg-muted/20 p-4 border border-[#dee2e6] rounded">
                  {!activeResult && !createQuery.isPending && (
                    <div className="text-center text-muted-foreground my-8">
                      <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Type a query below to search your documents securely.</p>
                    </div>
                  )}

                  {createQuery.isPending && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                      <p className="text-sm text-muted-foreground animate-pulse">Running semantic search...</p>
                    </div>
                  )}

                  {activeResult && !createQuery.isPending && (
                    <div className="space-y-6">
                      <div className="bg-white border border-[#dee2e6] p-4 rounded text-sm text-[#212529] shadow-sm">
                        {activeResult.response.split('\n').map((para, i) => (
                          <p key={i} className="mb-3 last:mb-0 leading-relaxed">{para}</p>
                        ))}
                      </div>

                      {activeResult.sources && activeResult.sources.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-[#212529] mb-2">Sources Found:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {activeResult.sources.map((source, idx) => (
                              <div key={idx} className="border border-[#dee2e6] bg-[#f8f9fa] p-2 flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="truncate">{source.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={createQuery.isPending}
                    placeholder="Search documents or ask a question..."
                    className="flex-1 border border-[#dee2e6] rounded px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button 
                    type="submit" 
                    disabled={!queryInput.trim() || createQuery.isPending}
                    className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    Query
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* Right Sidebar Columns */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-6">
            
            {/* Timeline Block */}
            <div className="bg-white border border-[#dee2e6] rounded-sm">
              <div className="px-4 py-2 bg-transparent border-b border-[#dee2e6]">
                <h3 className="font-normal text-[15px] text-[#212529]">Timeline</h3>
              </div>
              <div className="p-4 text-sm">
                <select className="w-[140px] border border-[#dee2e6] rounded p-1.5 text-sm mb-2 focus:outline-none focus:border-primary bg-white text-[#495057] block">
                  <option>Next 7 days</option>
                  <option>Next 30 days</option>
                  <option>Next 3 months</option>
                  <option>Next 6 months</option>
                </select>
                <select className="w-[140px] border border-[#dee2e6] rounded p-1.5 text-sm mb-4 focus:outline-none focus:border-primary bg-white text-[#495057] block">
                  <option>Sort by dates</option>
                  <option>Sort by courses</option>
                </select>
                
                <input 
                  type="text" 
                  placeholder="Search by" 
                  className="w-[140px] border border-[#dee2e6] rounded p-1 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                />

                <div className="text-center text-sm text-muted-foreground mt-8 mb-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#f8f9fa] rounded-sm flex items-center justify-center mb-3">
                    <ClipboardList className="w-8 h-8 text-[#ced4da]" />
                  </div>
                  No activities require action
                </div>
              </div>
            </div>

            {/* Latest Badges Block */}
            <div className="bg-white border border-[#dee2e6] rounded-sm">
              <div className="px-4 py-2 bg-transparent border-b border-[#dee2e6]">
                <h3 className="font-normal text-[15px] text-[#212529]">Latest badges</h3>
              </div>
              <div className="p-4 text-sm text-[#212529]">
                You have no badges to display
              </div>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
