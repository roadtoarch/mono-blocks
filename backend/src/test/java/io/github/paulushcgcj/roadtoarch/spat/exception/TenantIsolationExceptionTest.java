package io.github.paulushcgcj.roadtoarch.spat.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.paulushcgcj.roadtoarch.spat.util.TenantIsolationUtil;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

class TenantIsolationExceptionTest {

	@Test
	void assertTenantMatch_matchingTenants_doesNotThrow() {
		TenantIsolationUtil.assertTenantMatch("t1", "t1");
		// No exception means pass
	}

	@Test
	void assertTenantMatch_mismatchedTenants_throwsException() {
		assertThatThrownBy(() -> TenantIsolationUtil.assertTenantMatch("t1", "t2"))
			.isInstanceOf(TenantIsolationException.class)
			.hasMessage("Cross-tenant access denied");
	}

	@Test
	void assertTenantMatch_nullTargetTenant_throwsException() {
		assertThatThrownBy(() -> TenantIsolationUtil.assertTenantMatch("t1", null))
			.isInstanceOf(TenantIsolationException.class)
			.hasMessage("Cross-tenant access denied");
	}

	@Test
	void responseStatusAnnotation_isPresentAndForbidden() {
		ResponseStatus annotation = TenantIsolationException.class.getAnnotation(ResponseStatus.class);
		assertThat(annotation).isNotNull();
		assertThat(annotation.value()).isEqualTo(HttpStatus.FORBIDDEN);
	}
}
