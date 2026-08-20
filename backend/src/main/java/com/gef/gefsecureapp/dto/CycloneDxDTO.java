package com.gef.gefsecureapp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Forma minima del SBOM CycloneDX que nos interesa leer (lo que genera `syft ... -o
 *  cyclonedx-json`). El documento real trae muchos mas campos (metadata, dependencies,
 *  licenses, etc.) que se ignoran a proposito. */
public class CycloneDxDTO {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Document(List<Component> components) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Component(String type, String name, String version, String group, String purl) {}
}
