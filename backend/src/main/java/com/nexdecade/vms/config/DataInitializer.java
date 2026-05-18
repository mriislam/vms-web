package com.nexdecade.vms.config;

import com.nexdecade.vms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final Map<String, String> CREDENTIALS = Map.of(
        "admin",    "admin123",
        "manager",  "manager123",
        "operator", "operator123",
        "ops_2",    "operator123",
        "viewer",   "viewer123"
    );

    @Override
    public void run(String... args) {
        userRepository.findAll().forEach(user -> {
            String pwd = CREDENTIALS.get(user.getUsername());
            if (pwd != null) {
                user.setPasswordHash(passwordEncoder.encode(pwd));
                userRepository.save(user);
                log.info("Password synced for user: {}", user.getUsername());
            }
        });
    }
}
