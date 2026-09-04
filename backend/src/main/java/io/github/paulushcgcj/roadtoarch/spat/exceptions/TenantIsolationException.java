package io.github.paulushcgcj.roadtoarch.spat.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thrown when an authenticated user attempts to access resources belonging to a
 * different tenant. The {@link ResponseStatus} annotation causes Spring MVC to
 * translate this exception into an HTTP {@code 403 Forbidden} response (rendered
 * as an RFC 7807 {@code ProblemDetail} when {@code spring.mvc.problemdetails.enabled}
 * is {@code true}).
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class TenantIsolationException extends ResponseStatusException {

	public TenantIsolationException(String message) {
		super(HttpStatus.FORBIDDEN, message);
	}

	public TenantIsolationException(String message, Throwable cause) {
		super(HttpStatus.FORBIDDEN, message, cause);
	}
}
