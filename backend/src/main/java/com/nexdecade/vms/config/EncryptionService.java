package com.nexdecade.vms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM payload encryption service.
 * Key is derived via SHA-256 of the configured passphrase — same passphrase on
 * backend (application.properties) and frontend (VITE_ENCRYPTION_KEY) produces
 * the same 256-bit key, enabling transparent encrypt/decrypt on both sides.
 *
 * Wire format: Base64( IV[12] || Ciphertext+GCMTag[n+16] )
 */
@Service
public class EncryptionService {

    private static final int GCM_IV_BYTES  = 12;
    private static final int GCM_TAG_BITS  = 128;

    @Value("${vms.encryption.enabled:false}")
    private boolean enabled;

    private final byte[] keyBytes;

    public EncryptionService(@Value("${vms.encryption.secret-key:VMS-Default-Key}") String passphrase) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            this.keyBytes = sha.digest(passphrase.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive AES key", e);
        }
    }

    public boolean isEnabled() { return enabled; }

    public String encrypt(String plaintext) throws Exception {
        byte[] iv = new byte[GCM_IV_BYTES];
        new SecureRandom().nextBytes(iv);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,
            new SecretKeySpec(keyBytes, "AES"),
            new GCMParameterSpec(GCM_TAG_BITS, iv));
        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        byte[] combined = new byte[GCM_IV_BYTES + ciphertext.length];
        System.arraycopy(iv, 0, combined, 0, GCM_IV_BYTES);
        System.arraycopy(ciphertext, 0, combined, GCM_IV_BYTES, ciphertext.length);
        return Base64.getEncoder().encodeToString(combined);
    }

    public String decrypt(String encryptedBase64) throws Exception {
        byte[] combined  = Base64.getDecoder().decode(encryptedBase64);
        byte[] iv        = new byte[GCM_IV_BYTES];
        byte[] ciphertext = new byte[combined.length - GCM_IV_BYTES];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_BYTES);
        System.arraycopy(combined, GCM_IV_BYTES, ciphertext, 0, ciphertext.length);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,
            new SecretKeySpec(keyBytes, "AES"),
            new GCMParameterSpec(GCM_TAG_BITS, iv));
        return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
    }
}
