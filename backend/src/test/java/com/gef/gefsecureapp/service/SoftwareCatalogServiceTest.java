package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.SoftwareCatalogDTO;
import com.gef.gefsecureapp.mapper.SoftwareCatalogMapper;
import com.gef.gefsecureapp.model.SoftwareCatalog;
import com.gef.gefsecureapp.repository.SoftwareCatalogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SoftwareCatalogServiceTest {

    @Mock private SoftwareCatalogRepository catalogRepository;
    @Mock private SoftwareCatalogMapper catalogMapper;

    @InjectMocks private SoftwareCatalogService catalogService;

    @Test
    @DisplayName("search() devuelve lista vacia sin consultar el repositorio cuando la query esta en blanco")
    void search_should_returnEmptyList_when_queryIsBlank() {
        List<SoftwareCatalogDTO.Response> result = catalogService.search("   ");

        assertThat(result).isEmpty();
        verifyNoInteractions(catalogRepository);
    }

    @Test
    @DisplayName("search() recorta la query y mapea los resultados del repositorio")
    void search_should_trimQuery_and_mapResults() {
        SoftwareCatalog entity = SoftwareCatalog.builder().packageName("express").ecosystem("npm").build();
        SoftwareCatalogDTO.Response mapped = SoftwareCatalogDTO.Response.builder()
                .packageName("express").ecosystem("npm").build();

        when(catalogRepository.search("expr")).thenReturn(List.of(entity));
        when(catalogMapper.toResponse(entity)).thenReturn(mapped);

        List<SoftwareCatalogDTO.Response> result = catalogService.search("  expr  ");

        assertThat(result).containsExactly(mapped);
    }
}
