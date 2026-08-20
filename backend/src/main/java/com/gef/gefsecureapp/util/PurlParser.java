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

    private static final Map<String, String> ECOSYSTEM_BY_PURL_TYPE = Map.of(
            "maven", "maven",
            "npm", "npm",
            "pypi", "pip",
            "gem", "rubygems",
            "composer", "composer",
            "golang", "go",
            "cargo", "rust",
            "docker", "docker",
            "oci", "docker"
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

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }
}
