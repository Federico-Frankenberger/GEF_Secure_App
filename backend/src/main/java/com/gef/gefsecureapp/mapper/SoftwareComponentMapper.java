package com.gef.gefsecureapp.mapper;

import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import com.gef.gefsecureapp.model.SoftwareComponent;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface SoftwareComponentMapper {

    @Mapping(target = "id",          ignore = true)
    @Mapping(target = "lastScan",    ignore = true)
    @Mapping(target = "asset",       ignore = true)
    SoftwareComponent toEntity(SoftwareComponentDTO.Request dto);

    @Mapping(target = "environmentId",       source = "asset.environment.id")
    @Mapping(target = "environmentName",     source = "asset.environment.name")
    @Mapping(target = "businessCriticality", source = "asset.environment.businessCriticality")
    @Mapping(target = "assetId",             source = "asset.id")
    @Mapping(target = "assetName",           source = "asset.name")
    SoftwareComponentDTO.Response toResponse(SoftwareComponent entity);

    @Mapping(target = "id",          ignore = true)
    @Mapping(target = "lastScan",    ignore = true)
    @Mapping(target = "asset",       ignore = true)
    void updateEntity(SoftwareComponentDTO.Request dto, @MappingTarget SoftwareComponent existing);
}
