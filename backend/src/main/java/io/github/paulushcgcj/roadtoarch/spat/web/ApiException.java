package io.github.paulushcgcj.roadtoarch.spat.web;

import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Application-level exception carrying the HTTP status to surface and an optional set of
 * structured properties.
 *
 * <p>{@link ApiExceptionHandler} renders it as an RFC 7807 {@code ProblemDetail}, so throwing
 * this from the service layer is the single way controllers signal 400/404/409 outcomes.
 */
public class ApiException extends RuntimeException {

	private final transient HttpStatus status;
	private final transient Map<String, Object> details;

	/**
	 * Creates an exception with no extra properties.
	 *
	 * @param status HTTP status to surface
	 * @param message human-readable detail for the response body
	 */
	public ApiException(HttpStatus status, String message) {
		this(status, message, Map.of());
	}

	/**
	 * Creates an exception with extra ProblemDetail properties (for example an {@code errors} map).
	 *
	 * @param status HTTP status to surface
	 * @param message human-readable detail for the response body
	 * @param details additional properties merged into the ProblemDetail; may be {@code null}
	 */
	public ApiException(HttpStatus status, String message, Map<String, Object> details) {
		super(message);
		this.status = status;
		this.details = details == null ? Map.of() : details;
	}

	public HttpStatus status() {
		return status;
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
