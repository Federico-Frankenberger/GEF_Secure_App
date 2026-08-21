package com.gef.gefsecureapp.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
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

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorBody> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        log.warn("Archivo subido supera el tamaño máximo permitido: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(new ErrorBody(413, "El archivo supera el tamaño máximo permitido"));
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
