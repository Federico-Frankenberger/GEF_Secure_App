package com.gef.gefsecureapp.validation;

import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Map;
import java.util.regex.Pattern;

public class SoftwareCoordinateFormatValidator
        implements ConstraintValidator<ValidSoftwareCoordinate, SoftwareComponentDTO.Request> {

    // Formato minimo que cada ecosistema exige para matchear contra GitHub Advisory --
    // ver PROMPT_AUDITORIA_END_TO_END_VULNERABILIDADES.md §4 para el detalle por ecosistema.
    // Ecosistemas ausentes de este mapa (npm, pip, nuget, cargo, go, rubygems, o cualquier
    // valor no reconocido) no tienen formato exigible aca a proposito.
    private static final Map<String, Pattern> FORMAT_BY_ECOSYSTEM = Map.of(
            "maven", Pattern.compile("^[\\w.\\-]+:[\\w.\\-]+$"),
            "composer", Pattern.compile("^[\\w.\\-]+/[\\w.\\-]+$")
    );

    private static final Map<String, String> HINT_BY_ECOSYSTEM = Map.of(
            "maven", "el formato esperado es 'groupId:artifactId' (ej. org.springframework.boot:spring-boot-starter-web), no solo el artifactId",
            "composer", "el formato esperado es 'vendor/paquete' (ej. contao/contao)"
    );

    @Override
    public boolean isValid(SoftwareComponentDTO.Request dto, ConstraintValidatorContext context) {
        if (dto == null || dto.getEcosystem() == null || dto.getSoftware() == null) return true; // @NotBlank ya cubre esto
        String ecosystem = dto.getEcosystem().trim().toLowerCase();
        Pattern expected = FORMAT_BY_ECOSYSTEM.get(ecosystem);
        if (expected == null) return true;
        if (expected.matcher(dto.getSoftware().trim()).matches()) return true;

        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(
                        "Formato de 'software' inválido para " + ecosystem + ": " + HINT_BY_ECOSYSTEM.get(ecosystem))
                .addPropertyNode("software")
                .addConstraintViolation();
        return false;
    }
}
