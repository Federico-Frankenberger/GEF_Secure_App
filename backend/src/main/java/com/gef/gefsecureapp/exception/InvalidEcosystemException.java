package com.gef.gefsecureapp.exception;

/** Fase 4 (docs/20-08-26/AUDITORIA_END_TO_END_2.md, ECO-CATALOGO): un ecosystem que no
 *  existe en el catalogo administrable (public.ecosystems) nunca va a poder matchear
 *  contra GitHub Advisory -- es un falso negativo permanente y silencioso si se permite
 *  persistir igual. */
public class InvalidEcosystemException extends RuntimeException {
    public InvalidEcosystemException(String ecosystem) {
        super("El ecosistema '" + ecosystem + "' no está en el catálogo administrable (Config > Ecosistemas)");
    }
}
