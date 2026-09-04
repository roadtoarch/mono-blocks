package io.github.paulushcgcj.roadtoarch.spat;

import io.github.paulushcgcj.roadtoarch.spat.extensions.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class SpatApplicationTests {

	@Test
	void contextLoads() {
	}

}
