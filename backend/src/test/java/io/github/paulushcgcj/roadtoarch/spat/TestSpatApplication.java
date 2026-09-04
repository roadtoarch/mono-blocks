package io.github.paulushcgcj.roadtoarch.spat;

import io.github.paulushcgcj.roadtoarch.spat.extensions.TestcontainersConfiguration;
import org.springframework.boot.SpringApplication;

public class TestSpatApplication {

	public static void main(String[] args) {
		SpringApplication.from(SpatApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
