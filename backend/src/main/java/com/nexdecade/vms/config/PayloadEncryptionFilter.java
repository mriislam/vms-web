package com.nexdecade.vms.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.*;
import java.nio.charset.StandardCharsets;

/**
 * Servlet filter that transparently decrypts incoming request bodies and
 * encrypts outgoing JSON response bodies using AES-256-GCM.
 *
 * Wire format for both directions:
 *   { "enc": "<base64(IV[12] || Ciphertext+Tag)>" }
 *
 * Skipped when:
 *  - encryption is disabled (vms.encryption.enabled=false)
 *  - request URI contains /api/auth/
 *  - request is multipart (file uploads)
 *  - response is not application/json
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PayloadEncryptionFilter extends OncePerRequestFilter {

    private final EncryptionService enc;
    private final ObjectMapper      mapper;

    public PayloadEncryptionFilter(EncryptionService enc, ObjectMapper mapper) {
        this.enc    = enc;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        if (!enc.isEnabled()) return true;
        String uri = request.getRequestURI();
        if (uri.contains("/api/auth/") || uri.equals("/api/health")) return true;
        String ct = request.getContentType();
        return ct != null && ct.startsWith("multipart/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        // ── Decrypt request body ───────────────────────────────────
        HttpServletRequest processedReq = request;
        String ct = request.getContentType();
        if (ct != null && ct.contains("application/json")) {
            byte[] raw = request.getInputStream().readAllBytes();
            if (raw.length > 0) {
                try {
                    JsonNode node = mapper.readTree(raw);
                    if (node.has("enc")) {
                        String decrypted = enc.decrypt(node.get("enc").asText());
                        processedReq = new BodyReplacingWrapper(request, decrypted.getBytes(StandardCharsets.UTF_8));
                    } else {
                        processedReq = new BodyReplacingWrapper(request, raw);
                    }
                } catch (Exception e) {
                    processedReq = new BodyReplacingWrapper(request, raw);
                }
            }
        }

        // ── Capture and encrypt response ───────────────────────────
        ContentCachingResponseWrapper respWrapper = new ContentCachingResponseWrapper(
                java.util.Objects.requireNonNull(response));
        chain.doFilter(processedReq, respWrapper);

        byte[] body    = respWrapper.getContentAsByteArray();
        String respCt  = respWrapper.getContentType();
        boolean isJson = respCt != null && respCt.contains("application/json");

        if (body.length > 0 && isJson) {
            try {
                String encrypted = enc.encrypt(new String(body, StandardCharsets.UTF_8));
                byte[] encBody   = ("{\"enc\":\"" + encrypted + "\"}").getBytes(StandardCharsets.UTF_8);
                response.setContentType("application/json;charset=UTF-8");
                response.setContentLength(encBody.length);
                response.getOutputStream().write(encBody);
                return;
            } catch (Exception e) {
                // fall through to original body on encryption failure
            }
        }
        respWrapper.copyBodyToResponse();
    }

    /* ── Inner classes ─────────────────────────────────────────────── */

    private static final class BodyReplacingWrapper extends HttpServletRequestWrapper {
        private final byte[] body;
        BodyReplacingWrapper(HttpServletRequest req, byte[] body) { super(req); this.body = body; }

        @Override public int            getContentLength()     { return body.length; }
        @Override public long           getContentLengthLong() { return body.length; }
        @Override public BufferedReader getReader()            { return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8)); }
        @Override public ServletInputStream getInputStream()   { return new ByteArrayServletInputStream(body); }
    }

    private static final class ByteArrayServletInputStream extends ServletInputStream {
        private final ByteArrayInputStream stream;
        ByteArrayServletInputStream(byte[] body) { this.stream = new ByteArrayInputStream(body); }
        @Override public boolean  isFinished()                         { return stream.available() == 0; }
        @Override public boolean  isReady()                            { return true; }
        @Override public void     setReadListener(ReadListener listener) {}
        @Override public int      read()                                { return stream.read(); }
    }
}
