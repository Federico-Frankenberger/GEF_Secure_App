package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.SoftwareCatalogDTO;
import com.gef.gefsecureapp.mapper.SoftwareCatalogMapper;
import com.gef.gefsecureapp.repository.SoftwareCatalogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SoftwareCatalogService {

    private final SoftwareCatalogRepository catalogRepository;
    private final SoftwareCatalogMapper catalogMapper;

    @Transactional(readOnly = true)
    public List<SoftwareCatalogDTO.Response> search(String query) {
        if (query == null || query.isBlank()) return List.of();
        return catalogRepository.search(query.trim()).stream()
                .map(catalogMapper::toResponse)
                .toList();
    }
}
