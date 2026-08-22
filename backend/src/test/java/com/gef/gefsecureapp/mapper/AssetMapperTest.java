package com.gef.gefsecureapp.mapper;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.model.Asset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AssetMapperTest {

    private final AssetMapper mapper = new AssetMapperImpl();

    @Test
    @DisplayName("Fase 10 (opcional, docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): toResponse() expone exposed")
    void toResponse_should_exposeExposedField() {
        Asset asset = Asset.builder().id(1L).name("Servidor Demo").assetType("HOST").exposed(true).build();

        AssetDTO.Response response = mapper.toResponse(asset);

        assertThat(response.getExposed()).isTrue();
    }

    @Test
    @DisplayName("Fase 10: toEntity() copia exposed del Request, null si no se declaro")
    void toEntity_should_copyExposed_orLeaveNull_whenNotDeclared() {
        AssetDTO.Request withExposed = AssetDTO.Request.builder().name("A").exposed(false).build();
        AssetDTO.Request withoutExposed = AssetDTO.Request.builder().name("B").build();

        assertThat(mapper.toEntity(withExposed).getExposed()).isFalse();
        assertThat(mapper.toEntity(withoutExposed).getExposed()).isNull();
    }
}
