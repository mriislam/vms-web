package com.nexdecade.vms.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Instant;

/**
 * TOTP (RFC 6238) implementation — compatible with Google Authenticator.
 * Secret stored as Base32; QR code uses otpauth:// URI.
 */
@Service
public class TotpService {

    private static final int    DIGITS = 6;
    private static final int    PERIOD = 30;   // seconds
    private static final int    WINDOW = 1;    // ±1 period tolerance

    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    // ── Generate a new random 20-byte secret (Base32 encoded) ────────────────
    public String generateSecret() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);
        return encodeBase32(bytes);
    }

    // ── Build the otpauth URI for QR code scanning ────────────────────────────
    public String buildOtpAuthUri(String account, String secret) {
        String issuer = "NEXVMS";
        return "otpauth://totp/" + issuer + ":" + encode(account)
            + "?secret=" + secret
            + "&issuer=" + issuer
            + "&algorithm=SHA1&digits=6&period=30";
    }

    // ── Verify a 6-digit code (checks current ± WINDOW periods) ─────────────
    public boolean verify(String secret, String code) {
        if (code == null || code.length() != DIGITS) return false;
        long step = Instant.now().getEpochSecond() / PERIOD;
        for (int i = -WINDOW; i <= WINDOW; i++) {
            try {
                if (generateCode(secret, step + i).equals(code)) return true;
            } catch (Exception ignored) {}
        }
        return false;
    }

    // ── Internal TOTP code generation ─────────────────────────────────────────
    private String generateCode(String secret, long step) throws Exception {
        byte[] key  = decodeBase32(secret);
        byte[] data = ByteBuffer.allocate(8).putLong(step).array();

        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);

        int offset = hash[hash.length - 1] & 0x0F;
        int otp    = ((hash[offset]     & 0x7F) << 24)
                   | ((hash[offset + 1] & 0xFF) << 16)
                   | ((hash[offset + 2] & 0xFF) <<  8)
                   | ((hash[offset + 3] & 0xFF));
        return String.format("%0" + DIGITS + "d", otp % 1_000_000);
    }

    // ── Base32 encode ─────────────────────────────────────────────────────────
    private String encodeBase32(byte[] data) {
        StringBuilder sb   = new StringBuilder();
        int           bits = 0;
        int           val  = 0;
        for (byte b : data) {
            val  = (val << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                sb.append(BASE32_CHARS.charAt((val >>> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) sb.append(BASE32_CHARS.charAt((val << (5 - bits)) & 31));
        return sb.toString();
    }

    // ── Base32 decode ─────────────────────────────────────────────────────────
    private byte[] decodeBase32(String s) {
        s = s.toUpperCase().replaceAll("[^A-Z2-7]", "");
        int        byteLen = s.length() * 5 / 8;
        byte[]     out     = new byte[byteLen];
        int        bits    = 0;
        int        val     = 0;
        int        idx     = 0;
        for (char c : s.toCharArray()) {
            val  = (val << 5) | BASE32_CHARS.indexOf(c);
            bits += 5;
            if (bits >= 8) { out[idx++] = (byte) (val >>> (bits - 8)); bits -= 8; }
        }
        return out;
    }

    private String encode(String s) {
        return s.replace("@", "%40").replace(" ", "%20");
    }
}
