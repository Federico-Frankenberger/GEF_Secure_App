package com.gef.gefsecureapp.mapper;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.model.Asset;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface AssetMapper {

    @Mapping(target = "id",          ignore = true)
    @Mapping(target = "createdAt",   ignore = true)
    @Mapping(target = "environment", ignore = true)
    Asset toEntity(AssetDTO.Request dto);

    @Mapping(target = "environmentId",   source = "environment.id")
    @Mapping(target = "environmentName", source = "environment.name")
    AssetDTO.Response toResponse(Asset entity);

    @Mapping(target = "id",          ignore = true)
    @Mapping(target = "createdAt",   ignore = true)
    @Mapping(target = "environment", ignore = true)
    void updateEntity(AssetDTO.Request dto, @MappingTarget Asset existing);
}
