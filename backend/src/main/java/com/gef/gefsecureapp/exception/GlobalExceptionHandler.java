package com.gef.gefsecureapp.exception;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.LocalDateTime;
import java.util.*;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorBody> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Recurso no encontrado: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorBody(404, ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorBody> handleConflict(ConflictException ex) {
        log.warn("Conflicto: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorBody(409, ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Acceso denegado: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorBody(403, "No tenés permiso para realizar esta acción"));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorBody> handleInvalidCredentials(InvalidCredentialsException ex) {
        log.warn("Login rechazado: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorBody(401, ex.getMessage()));
    }

    @ExceptionHandler(GhsaAdvisoryUnavailableException.class)
    public ResponseEntity<ErrorBody> handleGhsaAdvisoryUnavailable(GhsaAdvisoryUnavailableException ex) {
        log.warn("Advisory de GitHub no disponible: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new ErrorBody(502, ex.getMessage()));
    }

    @ExceptionHandler(InvalidInventoryFileException.class)
    public ResponseEntity<ErrorBody> handleInvalidInventoryFile(InvalidInventoryFileException ex) {
        log.warn("Archivo de inventario invalido: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorBody(400, ex.getMessage()));
    }

    @ExceptionHandler(InvalidEcosystemException.class)
    public ResponseEntity<ErrorBody> handleInvalidEcosystem(InvalidEcosystemException ex) {
        log.warn("Ecosistema invalido: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorBody(400, ex.getMessage()));
    }

    @ExceptionHandler(N8nUnavailableException.class)
    public ResponseEntity<ErrorBody> handleN8nUnavailable(N8nUnavailableException ex) {
        log.error("n8n no respondió: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new ErrorBody(502, ex.getMessage()));
    }

    // C6 (docs/20-08-26/AUDITORIA_END_TO_END.md): sin esto, una violacion de constraint
    // (ej. dos requests casi simultaneas creando el mismo componente, DB-05) caia en el
    // catch-all de mas abajo, que devolvia ex.getMessage() crudo -- nombres de tabla,
    // columna y constraint de Postgres expuestos directo al cliente.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorBody> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Violación de integridad de datos: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorBody(409, "El registro ya existe o viola una regla de integridad"));
    }

    // N8N-03 (plan de confiabilidad 2026-08-24): el retry automatico de
    // WebhookController solo cubre el camino de escaneos (via ConcurrencyFailureException).
    // Un humano editando el mismo caso del Kanban en dos pestañas a la vez no pasa por ese
    // retry -- sin este handler, ObjectOptimisticLockingFailureException caia en el
    // catch-all generico (500 "Error interno del servidor"), confuso para un conflicto que
    // en realidad es benigno y recuperable con solo recargar y reintentar.
    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorBody> handleOptimisticLock(org.springframework.orm.ObjectOptimisticLockingFailureException ex) {
        log.warn("Conflicto de version optimista: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorBody(409, "Este registro fue modificado por otro proceso mientras lo editabas. Recargá y volvé a intentar."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        log.warn("Archivo subido supera el tamaño máximo permitido: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorBody(413, "El archivo supera el tamaño máximo permitido"));
    }

    // RPT-DAYS-VALIDATION (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): valida
    // constraints de Bean Validation en @RequestParam/@PathVariable (ej. @Min en `days`)
    // -- MethodArgumentNotValidException de mas abajo solo cubre @Valid @RequestBody, no
    // parametros sueltos anotados directo en la firma del metodo.
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorBody> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("Parámetro inválido: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(new ErrorBody(400, "Parámetro inválido: " + ex.getMessage()));
    }

    // RPT-DAYS-VALIDATION: un @RequestParam de tipo primitivo (ej. `int days`) con un
    // valor no convertible (`days=abc`) fallaba en la resolucion de argumentos de Spring
    // MVC, antes de llegar siquiera al controller -- sin este handler, caia en el
    // catch-all generico (500), en vez de un 400 que le diga al cliente que el parametro
    // esta mal tipeado.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorBody> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Parámetro con tipo inválido: {}", ex.getMessage());
        String requiredType = describeType(ex.getRequiredType());
        return ResponseEntity.badRequest().body(new ErrorBody(400,
                "El parámetro '" + ex.getName() + "' debe ser un valor " + requiredType + "."));
    }

    // Nombres de tipo en espanol para los mensajes al cliente -- ex.getRequiredType() da
    // el nombre crudo de la clase Java (ej. "int"), que no es algo que un usuario final
    // deba ver tal cual.
    private String describeType(Class<?> type) {
        if (type == null) return "válido";
        return switch (type.getSimpleName()) {
            case "int", "Integer", "long", "Long", "short", "Short" -> "numérico entero";
            case "double", "Double", "float", "Float", "BigDecimal" -> "numérico";
            case "boolean", "Boolean" -> "verdadero/falso";
            default -> "válido de tipo " + type.getSimpleName();
        };
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        ErrorBody body = new ErrorBody(400, "Error de validación");
        body.fieldErrors = fieldErrors;
        return ResponseEntity.badRequest().body(body);
    }

    // C6: el detalle completo va al log server-side (ex, con stack trace); el cliente
    // solo recibe un mensaje generico -- antes ex.getMessage() se devolvia crudo en el
    // body, exponiendo nombres de tabla/columna/constraint u otros detalles internos
    // ante cualquier excepcion no mapeada explicitamente.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex, WebRequest request) {
        log.error("Error inesperado: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorBody(500, "Error interno del servidor"));
    }

    public static class ErrorBody {
        public int status;
        public String message;
        public LocalDateTime timestamp = LocalDateTime.now();
        public Map<String, String> fieldErrors;

        public ErrorBody(int status, String message) {
            this.status = status;
            this.message = message;
        }
    }
}
