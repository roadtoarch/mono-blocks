package io.github.paulushcgcj.roadtoarch.spat.exception;

import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

public class ApiException extends ResponseStatusException {

	private final transient Map<String, Object> details;

	public ApiException(HttpStatusCode status, @Nullable String reason) {
		super(status, reason);
		this.details = Map.of();
	}

	/**
	 * Creates an exception with extra ProblemDetail properties (for example an {@code errors} map).
	 *
	 * @param status HTTP status to surface
	 * @param message human-readable detail for the response body
	 * @param details additional properties merged into the ProblemDetail; may be {@code null}
	 */
	public ApiException(HttpStatusCode status, String message, Map<String, Object> details) {
		super(status, message);
		this.details = details == null ? Map.of() : details;
	}

	public Map<String, Object> details() {
		return details;
	}

	public static ApiException notFound(String message) {
		return new ApiException(HttpStatus.NOT_FOUND, message);
	}

	public static ApiException conflict(String message) {
		return new ApiException(HttpStatus.CONFLICT, message);
	}

	public static ApiException badRequest(String message) {
		return new ApiException(HttpStatus.BAD_REQUEST, message);
	}

	public static ApiException badRequest(String message, Map<String, Object> details) {
		return new ApiException(HttpStatus.BAD_REQUEST, message, details);
	}
}
