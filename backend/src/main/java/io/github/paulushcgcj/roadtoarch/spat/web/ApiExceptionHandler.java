package io.github.paulushcgcj.roadtoarch.spat.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates exceptions raised by the API into a single RFC 7807 {@link ProblemDetail} shape.
 *
 * <p>The contract is deliberately flat: every error response carries {@code status}, {@code title},
 * {@code detail} and {@code instance}, plus an {@code errors} object when the failure is a field
 * validation problem. Nothing here is domain-specific.
 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(ApiException.class)
	public ProblemDetail handleApi(ApiException ex, HttpServletRequest request) {
		return problem(ex.status(), ex.getMessage(), ex.details(), request);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ProblemDetail handleBodyValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
		Map<String, Object> errors = new LinkedHashMap<>();
		for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
			errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
		}
		return problem(HttpStatus.BAD_REQUEST, "Validation failed", errors, request);
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	public ProblemDetail handleHandlerMethodValidation(
			HandlerMethodValidationException ex, HttpServletRequest request) {
		Map<String, Object> errors = new LinkedHashMap<>();
		ex.getParameterValidationResults().forEach(result -> {
			if (result instanceof ParameterErrors parameterErrors) {
				parameterErrors.getFieldErrors().forEach(fieldError ->
						errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage()));
				return;
			}
			String parameter = result.getMethodParameter().getParameterName();
			result.getResolvableErrors().forEach(message ->
					errors.putIfAbsent(parameter == null ? "request" : parameter, message.getDefaultMessage()));
		});
		return problem(HttpStatus.BAD_REQUEST, "Validation failed", errors, request);
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ProblemDetail handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
		Map<String, Object> errors = new LinkedHashMap<>();
		ex.getConstraintViolations().forEach(violation ->
				errors.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
		return problem(HttpStatus.BAD_REQUEST, "Validation failed", errors, request);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
		String raw = ex.getMostSpecificCause() == null ? null : ex.getMostSpecificCause().getMessage();
		return problem(HttpStatus.CONFLICT, describeIntegrity(raw), Map.of(), request);
	}

	@ExceptionHandler(PropertyReferenceException.class)
	public ProblemDetail handleBadSort(PropertyReferenceException ex, HttpServletRequest request) {
		return problem(HttpStatus.BAD_REQUEST, "Unknown sort property: " + ex.getPropertyName(), Map.of(), request);
	}

	@ExceptionHandler({
			MethodArgumentTypeMismatchException.class,
			HttpMessageNotReadableException.class,
			MissingServletRequestParameterException.class})
	public ProblemDetail handleMalformedRequest(Exception ex, HttpServletRequest request) {
		return problem(HttpStatus.BAD_REQUEST, "Malformed request", Map.of(), request);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ProblemDetail handleMethodNotSupported(
			HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
		return problem(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed", Map.of(), request);
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ProblemDetail handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
		return problem(HttpStatus.NOT_FOUND, "Not found", Map.of(), request);
	}

	@ExceptionHandler(Exception.class)
	public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
		log.error("Unhandled exception for {} {}", request.getMethod(), request.getRequestURI(), ex);
		return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", Map.of(), request);
	}

	private String describeIntegrity(String raw) {
		if (raw == null) {
			return "The request conflicts with an existing record.";
		}
		String lower = raw.toLowerCase();
		if (lower.contains("unique attribute")) {
			return "Another entity of this type already uses this attribute value.";
		}
		if (lower.contains("uq_relationship")) {
			return "This relationship already exists.";
		}
		return "The request conflicts with an existing record or reference.";
	}

	private ProblemDetail problem(
			HttpStatus status, String detail, Map<String, Object> details, HttpServletRequest request) {
		ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
		problemDetail.setTitle(status.getReasonPhrase());
		problemDetail.setInstance(URI.create(request.getRequestURI()));
		if (!details.isEmpty()) {
			problemDetail.setProperty("errors", details);
		}
		return problemDetail;
	}
}
