import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type DocumentResponse, type CreateDocumentRequest } from "@shared/schema";

export function useDocuments(tenantId?: number, category?: string) {
  return useQuery<DocumentResponse[]>({
    queryKey: ["/api/documents", { tenantId, category }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tenantId) params.append("tenantId", tenantId.toString());
      if (category) params.append("category", category);
      
      const res = await fetch(`/api/documents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    }
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateDocumentRequest) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to upload document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });
}
