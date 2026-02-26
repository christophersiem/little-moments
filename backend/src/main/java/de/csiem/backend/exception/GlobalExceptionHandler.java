package de.csiem.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatusException(
        ResponseStatusException ex,
        HttpServletRequest request
    ) {
        String message = ex.getReason() == null || ex.getReason().isBlank()
            ? "Request failed"
            : ex.getReason();

        return ResponseEntity.status(ex.getStatusCode())
            .body(toErrorResponse(ex.getStatusCode(), message, request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(
        Exception ex,
        HttpServletRequest request
    ) {
        HttpStatusCode status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status)
            .body(toErrorResponse(status, "Internal server error", request.getRequestURI()));
    }

    private ApiErrorResponse toErrorResponse(HttpStatusCode statusCode, String message, String path) {
        HttpStatus resolvedStatus = HttpStatus.resolve(statusCode.value());
        String error = resolvedStatus != null ? resolvedStatus.getReasonPhrase() : "HTTP " + statusCode.value();
        return new ApiErrorResponse(
            Instant.now(),
            statusCode.value(),
            error,
            message,
            path
        );
    }
}
