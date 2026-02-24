import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type QueryResponse, type ProcessedQueryResponse, type CreateQueryRequest } from "@shared/schema";

export function useQueries(tenantId?: number) {
  return useQuery<QueryResponse[]>({
    queryKey: ["/api/queries", { tenantId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tenantId) params.append("tenantId", tenantId.toString());
      
      const res = await fetch(`/api/queries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch queries");
      return res.json();
    }
  });
}

export function useCreateQuery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateQueryRequest): Promise<ProcessedQueryResponse> => {
      const res = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to process query");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
    },
  });
}
