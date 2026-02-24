package com.applicationmaker.tenantservice.tenant;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService service;

    public TenantController(TenantService service) {
        this.service = service;
    }

    @GetMapping
    public List<TenantDtos.TenantResponse> list() {
        return service.listTenants();
    }

    @GetMapping("/{id}")
    public TenantDtos.TenantResponse get(@PathVariable Long id) {
        return service.getTenant(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TenantDtos.TenantResponse create(@Valid @RequestBody TenantDtos.CreateTenantRequest request) {
        return service.createTenant(request);
    }
}

