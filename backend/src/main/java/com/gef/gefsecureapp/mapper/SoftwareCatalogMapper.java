package com.gef.gefsecureapp.mapper;

import com.gef.gefsecureapp.dto.SoftwareCatalogDTO;
import com.gef.gefsecureapp.model.SoftwareCatalog;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface SoftwareCatalogMapper {
    SoftwareCatalogDTO.Response toResponse(SoftwareCatalog entity);
}
