package com.gef.gefsecureapp.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class PurlParserTest {

    @ParameterizedTest(name = "{0} -> ecosystem={1} coordinate={2} version={3}")
    @CsvSource({
            "pkg:maven/org.springframework.boot/spring-boot-starter-web@3.1.0, maven, org.springframework.boot:spring-boot-starter-web, 3.1.0",
            "pkg:npm/axios@1.4.0, npm, axios, 1.4.0",
            "pkg:npm/%40angular/core@12.0.0, npm, '@angular/core', 12.0.0",
            "pkg:pypi/django@4.2.0, pip, django, 4.2.0",
            "pkg:gem/rails@7.0.0, rubygems, rails, 7.0.0",
            "pkg:composer/symfony/console@6.0.0, composer, symfony/console, 6.0.0",
            "pkg:golang/github.com/gin-gonic/gin@v1.9.0, go, github.com/gin-gonic/gin, v1.9.0",
            "pkg:cargo/serde@1.0.0, cargo, serde, 1.0.0",
    })
    @DisplayName("parse() traduce distintos tipos de purl a (ecosystem, coordinate, version)")
    void parse_should_translateKnownPurlTypes(String purl, String ecosystem, String coordinate, String version) {
        Optional<PurlParser.Parsed> result = PurlParser.parse(purl);

        assertThat(result).isPresent();
        assertThat(result.get().ecosystem()).isEqualTo(ecosystem);
        assertThat(result.get().coordinate()).isEqualTo(coordinate);
        assertThat(result.get().version()).isEqualTo(version);
    }

    @Test
    @DisplayName("parse() devuelve vacio para un tipo de purl no reconocido")
    void parse_should_returnEmpty_when_typeIsUnknown() {
        assertThat(PurlParser.parse("pkg:conan/zlib@1.2.13")).isEmpty();
    }

    @Test
    @DisplayName("ECO-CATALOGO (docs/20-08-26/AUDITORIA_END_TO_END_2.md): parse() no reconoce docker/oci -- no hay ecosistema equivalente en GitHub Advisory ni en el catalogo administrable, mejor NO_RECONOCIDO que persistir un ecosystem que nunca va a matchear")
    void parse_should_returnEmpty_forDockerOciImages() {
        assertThat(PurlParser.parse("pkg:oci/postgres@15?arch=amd64")).isEmpty();
        assertThat(PurlParser.parse("pkg:docker/postgres@15")).isEmpty();
    }

    @Test
    @DisplayName("parse() devuelve vacio cuando no hay version")
    void parse_should_returnEmpty_when_versionIsMissing() {
        assertThat(PurlParser.parse("pkg:npm/axios")).isEmpty();
    }

    @Test
    @DisplayName("parse() devuelve vacio para null o texto que no empieza con pkg:")
    void parse_should_returnEmpty_when_inputIsInvalid() {
        assertThat(PurlParser.parse(null)).isEmpty();
        assertThat(PurlParser.parse("no-es-un-purl")).isEmpty();
    }

    @Test
    @DisplayName("M1 (docs/20-08-26/AUDITORIA_END_TO_END.md): un '+' literal en la version (build metadata semver) no se convierte en espacio")
    void parse_should_keepLiteralPlus_inVersion() {
        Optional<PurlParser.Parsed> result = PurlParser.parse("pkg:npm/algo@1.0.0+build.5");

        assertThat(result).isPresent();
        assertThat(result.get().version()).isEqualTo("1.0.0+build.5");
    }
}
