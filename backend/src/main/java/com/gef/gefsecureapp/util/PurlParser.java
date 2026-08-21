package com.gef.gefsecureapp.util;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

/** Parsea Package URLs (https://github.com/package-url/purl-spec), el campo `purl` que trae
 *  cada componente de un SBOM CycloneDX (ej. generado por Syft), y los traduce al par
 *  (ecosystem, coordinate) que ya usa `software_components` -- mismo vocabulario que el resto
 *  del sistema (maven/npm/pip/rubygems/composer/go/rust/docker), para poder hacer upsert contra
 *  los componentes existentes de un activo sin heuristicas de nombre. */
public final class PurlParser {

    private PurlParser() {}

    // ECO-CATALOGO (docs/20-08-26/AUDITORIA_END_TO_END_2.md): este mapa es la unica fuente de
    // "ecosystem" para altas via SBOM -- si un valor de aca no existe en public.ecosystems
    // (cargo, composer, go, maven, npm, nuget, pip, rubygems), SoftwareComponentService lo
    // rechaza igual, pero es mejor no generar el valor incorrecto en primer lugar. "cargo"
    // (tipo de purl de Rust) mapeaba antes a "rust", que nunca estuvo en el catalogo -- typo
    // real confirmado en vivo con un componente cargado asi. "docker"/"oci" (imagenes de
    // contenedor) no tienen ecosistema equivalente en GitHub Advisory Database ni en este
    // catalogo -- se sacan del mapa a proposito, para que parse() devuelva empty() y el
    // import los marque NO_RECONOCIDO en vez de persistir un ecosystem que nunca va a matchear.
    private static final Map<String, String> ECOSYSTEM_BY_PURL_TYPE = Map.of(
            "maven", "maven",
            "npm", "npm",
            "pypi", "pip",
            "gem", "rubygems",
            "composer", "composer",
            "golang", "go",
            "cargo", "cargo"
    );

    public record Parsed(String ecosystem, String coordinate, String version) {}

    /** pkg:TYPE/[NAMESPACE/]NAME@VERSION[?qualifiers][#subpath] -- namespace es opcional.
     *  Maven junta namespace:name (groupId:artifactId, la convencion que usa GHSA); el resto
     *  de los ecosistemas con namespace (npm scoped, composer vendor/paquete, go module path)
     *  usan namespace/name. Sin version no sirve para matchear contra software_components. */
    public static Optional<Parsed> parse(String purl) {
        if (purl == null || !purl.startsWith("pkg:")) return Optional.empty();

        String body = purl.substring(4);
        int firstSlash = body.indexOf('/');
        if (firstSlash < 0) return Optional.empty();

        String type = body.substring(0, firstSlash).toLowerCase();
        String ecosystem = ECOSYSTEM_BY_PURL_TYPE.get(type);
        if (ecosystem == null) return Optional.empty();

        String rest = body.substring(firstSlash + 1);
        int cut = indexOfFirst(rest, '?', '#');
        if (cut >= 0) rest = rest.substring(0, cut);

        int at = rest.lastIndexOf('@');
        if (at < 0) return Optional.empty();
        String path = rest.substring(0, at);
        String version = decode(rest.substring(at + 1));
        if (path.isBlank() || version.isBlank()) return Optional.empty();

        int lastSlash = path.lastIndexOf('/');
        String coordinate;
        if (lastSlash < 0) {
            coordinate = decode(path);
        } else {
            String namespace = decode(path.substring(0, lastSlash));
            String name = decode(path.substring(lastSlash + 1));
            coordinate = "maven".equals(type) ? namespace + ":" + name : namespace + "/" + name;
        }

        return Optional.of(new Parsed(ecosystem, coordinate, version));
    }

    private static int indexOfFirst(String s, char a, char b) {
        int ia = s.indexOf(a), ib = s.indexOf(b);
        if (ia < 0) return ib;
        if (ib < 0) return ia;
        return Math.min(ia, ib);
    }

    // M1 (docs/20-08-26/AUDITORIA_END_TO_END.md): URLDecoder es para
    // application/x-www-form-urlencoded, donde "+" representa un espacio -- un PURL usa
    // percent-encoding puro (RFC 3986), donde "+" es un caracter literal valido y comun en
    // metadata de build de semver (ej. 1.0.0+build.5). Sin este fix, esa version se
    // guardaba como "1.0.0 build.5" (espacio en vez de "+"). Se escapa el "+" literal a
    // "%2B" antes de decodificar para que el decoder nunca lo trate como espacio, sin
    // afectar los "%XX" reales.
    private static String decode(String s) {
        return URLDecoder.decode(s.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
