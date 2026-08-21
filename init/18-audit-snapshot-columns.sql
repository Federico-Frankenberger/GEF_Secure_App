-- A-NUEVO-1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): vulnerabilities_audit no guardaba
-- una copia propia de que software/ecosystem/version estaba instalado al momento de la
-- deteccion -- el mapper lo derivaba en vivo desde software_components, asi que actualizar
-- el componente despues (edicion manual o reimportacion de SBOM) reescribia retroactivamente
-- que version aparecia en TODO hallazgo historico de ese componente.
--
-- Deliberadamente NULL para las filas ya existentes -- no se backfillea con el valor actual
-- del componente, porque eso seria fabricar un dato historico que ya se perdio (decision
-- explicita del usuario: "no inventes datos historicos"). El propio backend/n8n solo van a
-- leer estas columnas para hallazgos nuevos de aca en mas.
ALTER TABLE public.vulnerabilities_audit
    ADD COLUMN IF NOT EXISTS software VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ecosystem VARCHAR(50),
    ADD COLUMN IF NOT EXISTS version VARCHAR(50);
