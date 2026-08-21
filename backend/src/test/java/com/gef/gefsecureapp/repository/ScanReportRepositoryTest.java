package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.ScanReport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Cubre C5 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md): Postgres ordena los NULL
 *  primero en un ORDER BY ... DESC -- un escaneo trabado en RUNNING (executed_at NULL)
 *  le ganaba a uno mas nuevo ya completado, tanto en el polling del frontend como en el
 *  Historial. Primer @DataJpaTest del proyecto: corre contra el Postgres real configurado
 *  en application.properties (sin datasource embebido, no hay driver H2 en el classpath),
 *  cada test corre en su propia transaccion que Spring revierte sola al terminar. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ScanReportRepositoryTest {

    @Autowired
    private ScanReportRepository repository;

    private ScanReport running(String targetType, String targetName) {
        return ScanReport.builder()
                .startedAt(LocalDateTime.now().minusHours(1))
                .status("RUNNING")
                .targetType(targetType)
                .targetName(targetName)
                .totalDetected(0).audited(0).ignored(0)
                .publicCode("TST-" + UUID.randomUUID().toString().substring(0, 12))
                .build();
    }

    private ScanReport completed(String targetType, String targetName) {
        return ScanReport.builder()
                .startedAt(LocalDateTime.now())
                .executedAt(LocalDateTime.now())
                .status("COMPLETED")
                .targetType(targetType)
                .targetName(targetName)
                .totalDetected(5).audited(5).ignored(0)
                .systemStatus("✅ ESTABLE")
                .publicCode("TST-" + UUID.randomUUID().toString().substring(0, 12))
                .build();
    }

    @Test
    void findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc_ignoraUnRunningViejoColgado() {
        String target = "TEST-TARGET-" + UUID.randomUUID();
        repository.save(running("ACTIVO", target));
        repository.save(completed("ACTIVO", target));

        Optional<ScanReport> result =
                repository.findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc("ACTIVO", target);

        assertThat(result).isPresent();
        assertThat(result.get().getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc_soloRunning_devuelveVacioONoRompe() {
        String target = "TEST-SOLO-RUNNING-" + UUID.randomUUID();
        repository.save(running("ACTIVO", target));

        Optional<ScanReport> result =
                repository.findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc("ACTIVO", target);

        // Hoy sigue devolviendo el RUNNING si es lo unico que hay (correcto: no hay nada
        // mejor que mostrar) -- lo que importa es que NO explote con NULLS LAST + LIMIT 1.
        assertThat(result).isPresent();
        assertThat(result.get().getStatus()).isEqualTo("RUNNING");
    }

    @Test
    void search_ordenaPorExecutedAtConNullsAlFinal() {
        String target = "TEST-SEARCH-" + UUID.randomUUID();
        repository.save(running("ACTIVO", target));
        repository.save(completed("ACTIVO", target));

        var page = repository.search("ACTIVO", target, null, null, null, PageRequest.of(0, 10));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().get(0).getStatus()).isEqualTo("COMPLETED");
        assertThat(page.getContent().get(1).getStatus()).isEqualTo("RUNNING");
    }
}
