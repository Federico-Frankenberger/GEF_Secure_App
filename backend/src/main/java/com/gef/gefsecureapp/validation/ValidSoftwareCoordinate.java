package com.gef.gefsecureapp.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Fase 3 (docs/20-08-26/AUDITORIA_END_TO_END_2.md, normalizacion Maven): el alta manual de
 *  un componente aceptaba cualquier texto libre en `software`, sin exigir el formato minimo
 *  que cada ecosistema necesita para matchear contra GitHub Advisory (maven: "groupId:artifactId",
 *  composer: "vendor/paquete") -- asi se cargo alguna vez "spring-boot-starter-web" en vez de
 *  "org.springframework.boot:spring-boot-starter-web", un falso negativo real confirmado en vivo.
 *  Ecosistemas sin un formato exigible (npm, pip, nuget, cargo, go, rubygems, o cualquier valor
 *  no reconocido) no se restringen aca -- eso es responsabilidad de la validacion de catalogo
 *  (ECO-CATALOGO, Fase 4), no de esta. */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SoftwareCoordinateFormatValidator.class)
public @interface ValidSoftwareCoordinate {
    String message() default "El formato de 'software' no coincide con lo que este ecosistema espera";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
