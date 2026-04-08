package com.gef.gefsecureapp.mapper;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.model.Asset;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface AssetMapper {

    // Request → Entity (ignorar id y lastScan, los gestiona el service)
    @Mapping(target = "id",       ignore = true)
    @Mapping(target = "lastScan", ignore = true)
    Asset toEntity(AssetDTO.Request dto);

    // Entity → Response (mapeo 1:1, los nombres coinciden)
    AssetDTO.Response toResponse(Asset entity);

    // Actualización parcial: solo sobreescribe los campos del DTO
    @Mapping(target = "id",       ignore = true)
    @Mapping(target = "lastScan", ignore = true)
    void updateEntity(AssetDTO.Request dto, @MappingTarget Asset existing);
}
