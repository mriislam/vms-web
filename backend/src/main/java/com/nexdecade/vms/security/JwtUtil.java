package com.nexdecade.vms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${vms.jwt.secret:NexdecadeVMS-SuperSecret-Key-2024-AtLeast256BitsLongForHS256Algorithm}")
    private String secret;

    @Value("${vms.jwt.expiration:86400000}")
    private long expiration;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** Generate token without tenant claims (super-admin or legacy). */
    public String generate(UserDetails user) {
        return generate(user, null, null);
    }

    /** Generate token with tenant claims embedded. */
    public String generate(UserDetails user, Long tenantId, String tenantSlug) {
        var builder = Jwts.builder()
                .subject(user.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration));
        if (tenantId   != null) builder.claim("tid",   tenantId);
        if (tenantSlug != null) builder.claim("tslug", tenantSlug);
        return builder.signWith(key()).compact();
    }

    public String extractUsername(String token) {
        return claims(token).getSubject();
    }

    public Long extractTenantId(String token) {
        Object v = claims(token).get("tid");
        if (v == null) return null;
        return v instanceof Number n ? n.longValue() : Long.parseLong(v.toString());
    }

    public String extractTenantSlug(String token) {
        Object v = claims(token).get("tslug");
        return v != null ? v.toString() : null;
    }

    public boolean isValid(String token, UserDetails user) {
        try {
            return extractUsername(token).equals(user.getUsername())
                    && !claims(token).getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload();
    }
}
