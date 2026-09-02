package io.github.paulushcgcj.roadtoarch.spat.configuration;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bindable configuration properties for the frontend origin and its CORS policy.
 *
 * <p>Bound from {@code io.github.paulushcgcj.spat.frontend.*} in {@code application.yml}.
 */
@ConfigurationProperties(prefix = "io.github.paulushcgcj.spat.frontend")
public record FrontendProperties(String url, Cors cors) {

	/**
	 * CORS parameters applied to backend responses.
	 *
	 * @param headers allowed request headers
	 * @param methods allowed HTTP methods
	 * @param age     max age for preflight cache entries
	 * @param origins allowed origin URLs
	 */
	public record Cors(List<String> headers, List<String> methods, Duration age, List<String> origins) {}
}
