package com.applicationmaker.tenantservice.tenant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TenantService {

    private final TenantRepository repository;

    public TenantService(TenantRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<TenantDtos.TenantResponse> listTenants() {
        return repository.findAll()
                .stream()
                .map(TenantDtos::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantDtos.TenantResponse getTenant(Long id) {
        TenantEntity entity = repository.findById(id)
                .orElseThrow(() -> new TenantNotFoundException(id));
        return TenantDtos.fromEntity(entity);
    }

    public TenantDtos.TenantResponse createTenant(TenantDtos.CreateTenantRequest request) {
        TenantEntity entity = new TenantEntity();
        entity.setName(request.name());
        entity.setDomain(request.domain());
        TenantEntity saved = repository.save(entity);
        return TenantDtos.fromEntity(saved);
    }
}

