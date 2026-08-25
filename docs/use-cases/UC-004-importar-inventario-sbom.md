# UC-004 — Importar inventario de software (SBOM)

**Actor principal**: ADMIN o SECURITY_ANALYST.

**Actores secundarios**: ninguno (procesamiento síncrono en el backend; no interviene n8n en este flujo).

**Precondiciones**: el activo destino ya existe en el inventario; el actor cuenta con un archivo SBOM en formato CycloneDX JSON (típicamente generado con una herramienta externa como `syft <target> -o cyclonedx-json`).

## Flujo principal

1. El actor selecciona un activo y sube el archivo SBOM.
2. El frontend llama primero a `POST /api/assets/{id}/inventory/preview` (multipart) para previsualizar, sin persistir nada, qué cambiaría respecto al software actualmente registrado en ese activo (`InventoryDTO.Summary`: altas, bajas, sin cambios).
3. El actor revisa el resumen (ej. cuántos componentes nuevos, cuántos se eliminarían) y confirma.
4. El frontend llama a `POST /api/assets/{id}/inventory/import` (mismo archivo) para aplicar el cambio: el backend crea/actualiza el software del activo según el contenido real del SBOM.
5. El resultado (mismo formato `InventoryDTO.Summary`) confirma lo efectivamente aplicado.

## Flujos alternativos

- **El actor importa directo sin previsualizar**: válido — el paso de preview es una ayuda de UX, no un prerrequisito técnico del endpoint de import.

## Excepciones

- **Archivo no es CycloneDX JSON válido / está corrupto**: el parseo falla antes de calcular el resumen, con un error controlado (400) — no se persiste nada.
- **El activo indicado no existe**: 404 antes de intentar leer el archivo.

## Postcondiciones

El software del activo queda sincronizado con el contenido del SBOM importado (altas y bajas aplicadas); un escaneo posterior (ver [UC-001](UC-001-ejecutar-escaneo.md)) evaluará ese software actualizado.
