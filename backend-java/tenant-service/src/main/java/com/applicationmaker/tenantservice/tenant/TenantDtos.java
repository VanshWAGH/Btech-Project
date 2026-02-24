package com.applicationmaker.tenantservice.tenant;

import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;

public class TenantDtos {

    public record CreateTenantRequest(
            @NotBlank String name,
            String domain
    ) {
    }

    public record TenantResponse(
            Long id,
            String name,
            String domain,
            OffsetDateTime createdAt
    ) {
    }

    public static TenantResponse fromEntity(TenantEntity entity) {
        return new TenantResponse(
                entity.getId(),
                entity.getName(),
                entity.getDomain(),
                entity.getCreatedAt()
        );
    }
}

