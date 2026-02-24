import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type TenantResponse, type TenantMemberResponse, type CreateTenantRequest, type CreateTenantMemberRequest } from "@shared/schema";

export function useTenants() {
  return useQuery<TenantResponse[]>({
    queryKey: ["/api/tenants"],
  });
}

export function useTenant(id: number) {
  return useQuery<TenantResponse>({
    queryKey: ["/api/tenants", id],
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTenantRequest) => {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tenant");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
  });
}

export function useTenantMembers(tenantId: number) {
  return useQuery<TenantMemberResponse[]>({
    queryKey: [`/api/tenants/${tenantId}/members`],
    enabled: !!tenantId,
  });
}

export function useAddTenantMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTenantMemberRequest & { tenantId: number }) => {
      const { tenantId, ...body } = data;
      const res = await fetch(`/api/tenants/${tenantId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${variables.tenantId}/members`] });
    },
  });
}
