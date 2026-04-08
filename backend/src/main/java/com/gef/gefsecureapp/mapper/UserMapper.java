package com.gef.gefsecureapp.mapper;

import com.gef.gefsecureapp.dto.UserDTO;
import com.gef.gefsecureapp.model.User;
import org.mapstruct.*;

@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {

    @Mapping(target = "id",        ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "role",      defaultValue = "AUDITOR")
    User toEntity(UserDTO.Request dto);

    UserDTO.Response toResponse(User entity);

    // PUT: no toca username ni createdAt
    @Mapping(target = "id",        ignore = true)
    @Mapping(target = "username",  ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(UserDTO.Request dto, @MappingTarget User existing);
}
