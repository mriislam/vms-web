package com.nexdecade.vms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class VmsApplication {
    public static void main(String[] args) {
        SpringApplication.run(VmsApplication.class, args);
    }
}
