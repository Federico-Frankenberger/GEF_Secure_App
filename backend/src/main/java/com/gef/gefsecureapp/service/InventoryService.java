package com.gef.gefsecureapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gef.gefsecureapp.dto.CycloneDxDTO;
import com.gef.gefsecureapp.dto.InventoryDTO;
import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.InvalidInventoryFileException;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.util.PurlParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Importacion de inventario de software a partir de un SBOM CycloneDX (tipicamente generado
 *  con `syft <target> -o cyclonedx-json`). El campo `purl` de cada componente ya trae ecosistema
 *  + coordenada exacta + version en un formato estandar (ver PurlParser) -- reemplaza la carga
 *  manual como fuente de nombres, para que el software cargado matchee de una con las fuentes
 *  de vulnerabilidades sin que el usuario tenga que escribir el nombre "correcto" a mano. */
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private static final String IMPORT_DESCRIPTION = "Importado automáticamente desde SBOM (CycloneDX)";

    private final SoftwareComponentRepository softwareComponentRepository;
    private final SoftwareComponentService softwareComponentService;
    private final AssetService assetService;
    private final ObjectMapper objectMapper;

    /** Dry-run: calcula el diff contra el software actual del activo sin persistir nada. */
    @Transactional(readOnly = true)
    public InventoryDTO.Summary preview(Long assetId, MultipartFile file) {
        return process(assetId, file, false);
    }

    /** Mismo calculo que preview(), pero crea/actualiza los componentes del activo. */
    @Transactional
    public InventoryDTO.Summary importInventory(Long assetId, MultipartFile file) {
        return process(assetId, file, true);
    }

    private InventoryDTO.Summary process(Long assetId, MultipartFile file, boolean persist) {
        assetService.findById(assetId); // valida existencia + scope (404 si no corresponde)
        List<CycloneDxDTO.Component> components = readComponents(file);

        List<InventoryDTO.Item> items = new ArrayList<>();
        int nuevos = 0, actualizados = 0, sinCambios = 0, noReconocidos = 0, errores = 0;

        for (CycloneDxDTO.Component component : components) {
            Optional<PurlParser.Parsed> parsed = PurlParser.parse(component.purl());
            if (parsed.isEmpty()) {
                items.add(InventoryDTO.Item.builder()
                        .coordinate(component.name())
                        .status(InventoryDTO.ItemStatus.NO_RECONOCIDO)
                        .detail("No se pudo interpretar el purl: " + component.purl())
                        .build());
                noReconocidos++;
                continue;
            }

            PurlParser.Parsed p = parsed.get();
            String coordinate = p.coordinate().trim().toLowerCase();
            String ecosystem = p.ecosystem().trim().toLowerCase();

            Optional<SoftwareComponent> existing = softwareComponentRepository
                    .findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(assetId, coordinate, ecosystem);

            if (existing.isPresent() && p.version().equals(existing.get().getVersion())) {
                items.add(itemOf(p, InventoryDTO.ItemStatus.SIN_CAMBIOS, null, null));
                sinCambios++;
                continue;
            }

            if (existing.isPresent()) {
                String previousVersion = existing.get().getVersion();
                if (persist) softwareComponentService.update(existing.get().getId(), requestOf(assetId, p));
                items.add(itemOf(p, InventoryDTO.ItemStatus.ACTUALIZADO, previousVersion, null));
                actualizados++;
                continue;
            }

            try {
                if (persist) softwareComponentService.create(requestOf(assetId, p));
                items.add(itemOf(p, InventoryDTO.ItemStatus.NUEVO, null, null));
                nuevos++;
            } catch (ConflictException ex) {
                items.add(itemOf(p, InventoryDTO.ItemStatus.ERROR, null, ex.getMessage()));
                errores++;
            }
        }

        return InventoryDTO.Summary.builder()
                .total(components.size())
                .nuevos(nuevos).actualizados(actualizados).sinCambios(sinCambios)
                .noReconocidos(noReconocidos).errores(errores)
                .items(items)
                .build();
    }

    private InventoryDTO.Item itemOf(PurlParser.Parsed p, InventoryDTO.ItemStatus status,
                                      String previousVersion, String detail) {
        return InventoryDTO.Item.builder()
                .coordinate(p.coordinate()).ecosystem(p.ecosystem()).version(p.version())
                .previousVersion(previousVersion).status(status).detail(detail)
                .build();
    }

    private SoftwareComponentDTO.Request requestOf(Long assetId, PurlParser.Parsed p) {
        return SoftwareComponentDTO.Request.builder()
                .name(shortName(p.coordinate()) + " " + p.version())
                .software(p.coordinate())
                .ecosystem(p.ecosystem())
                .version(p.version())
                .assetId(assetId)
                .description(IMPORT_DESCRIPTION)
                .build();
    }

    /** La coordenada completa (ej. "org.springframework.boot:spring-boot-starter-web") ya
     *  queda en el campo `software` -- el nombre solo necesita el ultimo segmento para no
     *  duplicar la misma cadena larga en dos columnas de la tabla. */
    private String shortName(String coordinate) {
        int cut = Math.max(coordinate.lastIndexOf('/'), coordinate.lastIndexOf(':'));
        return cut >= 0 ? coordinate.substring(cut + 1) : coordinate;
    }

    private List<CycloneDxDTO.Component> readComponents(MultipartFile file) {
        if (file == null || file.isEmpty())
            throw new InvalidInventoryFileException("El archivo está vacío o no se recibió");
        try {
            CycloneDxDTO.Document doc = objectMapper.readValue(file.getInputStream(), CycloneDxDTO.Document.class);
            return doc.components() != null ? doc.components() : List.of();
        } catch (IOException ex) {
            throw new InvalidInventoryFileException("No se pudo leer el archivo como CycloneDX JSON: " + ex.getMessage());
        }
    }
}
