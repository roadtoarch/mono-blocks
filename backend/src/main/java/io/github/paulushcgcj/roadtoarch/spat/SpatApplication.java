package io.github.paulushcgcj.roadtoarch.spat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SpatApplication {

	public static void main(String[] args) {
		SpringApplication.run(SpatApplication.class, args);
	}

}
