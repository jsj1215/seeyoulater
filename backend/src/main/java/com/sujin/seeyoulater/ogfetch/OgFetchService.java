package com.sujin.seeyoulater.ogfetch;

import jakarta.annotation.PreDestroy;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.util.Timeout;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.IntPredicate;

/**
 * 사용자가 입력한 URL의 OG 메타데이터를 가져옴. 서버가 대신 요청을 보내므로 SSRF 방어가 핵심임.
 *
 * <p>방어 방식
 * <ul>
 *   <li>스킴은 http/https, 포트는 기본값/80/443만 허용</li>
 *   <li>리다이렉트는 자동으로 따라가지 않고 최대 4번까지 직접 따라가며, 홉마다 스킴/포트/IP를 다시 검증</li>
 *   <li>DNS rebinding 방지: jsoup은 연결할 IP를 지정할 수 없어서 Apache HttpClient의 DnsResolver를 교체함.
 *       DNS는 연결 시점에 한 번만 조회하고, 조회된 모든 IP를 검증한 뒤 그 IP 목록으로만 연결함.
 *       호스트명은 그대로 유지되므로 TLS SNI와 인증서 호스트명 검증도 정상 동작함</li>
 *   <li>프록시 설정(시스템 프로퍼티)은 사용하지 않음. 프록시를 쓰면 프록시가 다시 DNS를 조회해 고정 효과가 사라짐</li>
 *   <li>Content-Type이 text/html일 때만 파싱하고 본문은 2MB까지만 읽음. jsoup은 받은 바이트를 파싱하는 데만 사용</li>
 * </ul>
 */
@Service
public class OgFetchService {

    static final int MAX_REDIRECTS = 4;
    private static final int MAX_BODY_BYTES = 2 * 1024 * 1024;
    private static final long TOTAL_TIMEOUT_MILLIS = 10_000;
    private static final Set<Integer> ALLOWED_PORTS = Set.of(-1, 80, 443);
    private static final String USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    /** 테스트에서 로컬 서버(루프백)를 첫 홉으로만 허용하기 위한 seam. 운영에서는 IP 차단 목록만 사용 */
    @FunctionalInterface
    interface AddressPolicy {
        boolean isAllowed(String host, InetAddress address);
    }

    private final AddressPolicy addressPolicy;
    private final IntPredicate portPolicy;
    private final CloseableHttpClient httpClient;

    @Autowired
    public OgFetchService() {
        this((host, address) -> !isBlockedAddress(address), ALLOWED_PORTS::contains);
    }

    OgFetchService(AddressPolicy addressPolicy, IntPredicate portPolicy) {
        this.addressPolicy = addressPolicy;
        this.portPolicy = portPolicy;
        this.httpClient = buildClient();
    }

    @PreDestroy
    void close() throws IOException {
        httpClient.close();
    }

    public OgMetadata fetch(String url) {
        URI current = URI.create(url);
        long deadline = System.currentTimeMillis() + TOTAL_TIMEOUT_MILLIS;
        try {
            for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
                validateUri(current);
                FetchResult result = executeOnce(current, deadline);
                if (result.redirect() == null) {
                    return result.metadata();
                }
                current = result.redirect();
            }
            // 리다이렉트가 너무 많음
            return OgMetadata.empty();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            if (hasCause(e, BlockedAddressException.class)) {
                throw new IllegalArgumentException("URL resolves to a blocked address");
            }
            return OgMetadata.empty();
        }
    }

    private record FetchResult(URI redirect, OgMetadata metadata) {}

    private FetchResult executeOnce(URI uri, long deadline) throws IOException {
        HttpGet get = new HttpGet(uri);
        get.setHeader("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
        get.setHeader("Accept-Language", "ko-KR,ko;q=0.9,en;q=0.8");
        return httpClient.execute(get, response -> handleResponse(uri, response, deadline));
    }

    private FetchResult handleResponse(URI uri, ClassicHttpResponse response, long deadline) throws IOException {
        int code = response.getCode();
        if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
            Header location = response.getFirstHeader("Location");
            if (location == null) return new FetchResult(null, OgMetadata.empty());
            try {
                return new FetchResult(uri.resolve(new URI(location.getValue())), null);
            } catch (URISyntaxException e) {
                return new FetchResult(null, OgMetadata.empty());
            }
        }
        HttpEntity entity = response.getEntity();
        if (code < 200 || code >= 300 || entity == null) {
            return new FetchResult(null, OgMetadata.empty());
        }
        ContentType contentType = ContentType.parseLenient(entity.getContentType());
        if (contentType == null || !"text/html".equalsIgnoreCase(contentType.getMimeType())) {
            return new FetchResult(null, OgMetadata.empty());
        }
        byte[] body = readLimited(entity.getContent(), deadline);
        Charset charset = contentType.getCharset();
        Document doc = Jsoup.parse(new ByteArrayInputStream(body),
                charset != null ? charset.name() : null, uri.toString());
        return new FetchResult(null, parse(doc));
    }

    // 큰 응답은 앞부분 2MB만 읽고, 바이트를 천천히 흘려보내는 서버에 묶이지 않도록 전체 시간 제한도 둠
    private static byte[] readLimited(InputStream in, long deadline) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while (out.size() < MAX_BODY_BYTES && (n = in.read(buf, 0, Math.min(buf.length, MAX_BODY_BYTES - out.size()))) != -1) {
            out.write(buf, 0, n);
            if (System.currentTimeMillis() > deadline) {
                throw new IOException("OG fetch timed out");
            }
        }
        return out.toByteArray();
    }

    private void validateUri(URI uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            throw new IllegalArgumentException("Only http/https URLs are allowed");
        }
        String host = uri.getHost();
        if (host == null || host.isEmpty()) {
            throw new IllegalArgumentException("Invalid URL: no host");
        }
        if (!portPolicy.test(uri.getPort())) {
            throw new IllegalArgumentException("Only ports 80 and 443 are allowed");
        }
        // 빠른 실패용 사전 검사(IP 리터럴 포함). 실제 연결 IP 검증은 DnsResolver에서 한 번 더 수행
        try {
            resolveAndValidate(stripBrackets(host));
        } catch (BlockedAddressException e) {
            throw new IllegalArgumentException("URL resolves to a blocked address");
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Unknown host");
        }
    }

    private InetAddress[] resolveAndValidate(String host) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(host);
        for (InetAddress address : addresses) {
            if (!addressPolicy.isAllowed(host, address)) {
                throw new BlockedAddressException(host);
            }
        }
        return addresses;
    }

    private CloseableHttpClient buildClient() {
        DnsResolver pinningResolver = new DnsResolver() {
            @Override
            public InetAddress[] resolve(String host) throws UnknownHostException {
                return resolveAndValidate(stripBrackets(host));
            }

            @Override
            public List<InetSocketAddress> resolve(String host, int port) throws UnknownHostException {
                return Arrays.stream(resolve(host)).map(a -> new InetSocketAddress(a, port)).toList();
            }

            @Override
            public String resolveCanonicalHostname(String host) {
                return host;
            }
        };
        var connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
                .setDnsResolver(pinningResolver)
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                        .setConnectTimeout(Timeout.ofSeconds(5))
                        .setSocketTimeout(Timeout.ofSeconds(8))
                        .build())
                .setMaxConnTotal(20)
                .setMaxConnPerRoute(4)
                .build();
        return HttpClients.custom()
                .setConnectionManager(connectionManager)
                .disableRedirectHandling()
                .disableCookieManagement()
                .disableAutomaticRetries()
                .disableAuthCaching()
                .setUserAgent(USER_AGENT)
                .setDefaultRequestConfig(RequestConfig.custom()
                        .setResponseTimeout(Timeout.ofSeconds(8))
                        .setConnectionRequestTimeout(Timeout.ofSeconds(5))
                        .build())
                .build();
    }

    private static String stripBrackets(String host) {
        return host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
    }

    /**
     * 서버 내부망/메타데이터 서버 등으로 향할 수 있는 주소인지 판단.
     * IPv6 안에 IPv4를 담는 형식(IPv4-mapped, IPv4-compatible, NAT64, 6to4)은 안쪽 IPv4로 다시 검사함.
     */
    static boolean isBlockedAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return true;
        }
        byte[] b = address.getAddress();
        if (address instanceof Inet4Address) {
            return isBlockedIpv4(b);
        }
        if (address instanceof Inet6Address) {
            int first = b[0] & 0xff;
            if ((first & 0xfe) == 0xfc) return true; // fc00::/7 ULA
            if (first == 0xff) return true;          // multicast
            if ((first == 0xfe) && ((b[1] & 0xc0) == 0x80 || (b[1] & 0xc0) == 0xc0)) return true; // fe80::/10, fec0::/10
            boolean firstTenZero = true;
            for (int i = 0; i < 10; i++) {
                if (b[i] != 0) { firstTenZero = false; break; }
            }
            if (firstTenZero && (b[10] & 0xff) == 0xff && (b[11] & 0xff) == 0xff) {
                return isBlockedIpv4(Arrays.copyOfRange(b, 12, 16)); // ::ffff:a.b.c.d
            }
            boolean firstTwelveZero = firstTenZero && b[10] == 0 && b[11] == 0;
            if (firstTwelveZero) {
                return true; // ::/96 (::, ::1, IPv4-compatible 포함) 은 공인 목적지가 아님
            }
            if (first == 0x00 && (b[1] & 0xff) == 0x64 && (b[2] & 0xff) == 0xff && (b[3] & 0xff) == 0x9b) {
                return isBlockedIpv4(Arrays.copyOfRange(b, 12, 16)); // 64:ff9b::/96 NAT64
            }
            if (first == 0x20 && (b[1] & 0xff) == 0x02) {
                return isBlockedIpv4(Arrays.copyOfRange(b, 2, 6)); // 2002::/16 6to4
            }
            return false;
        }
        return true;
    }

    private static boolean isBlockedIpv4(byte[] b) {
        int a0 = b[0] & 0xff;
        int a1 = b[1] & 0xff;
        return a0 == 0                                   // 0.0.0.0/8
                || a0 == 10                              // 10.0.0.0/8
                || a0 == 127                             // 127.0.0.0/8
                || (a0 == 100 && (a1 & 0xc0) == 64)      // 100.64.0.0/10 CGNAT
                || (a0 == 169 && a1 == 254)              // 169.254.0.0/16 (클라우드 메타데이터 포함)
                || (a0 == 172 && (a1 & 0xf0) == 16)      // 172.16.0.0/12
                || (a0 == 192 && a1 == 168)              // 192.168.0.0/16
                || (a0 == 192 && a1 == 0 && (b[2] & 0xff) == 0) // 192.0.0.0/24
                || (a0 == 198 && (a1 & 0xfe) == 18)      // 198.18.0.0/15
                || a0 >= 224;                            // 224.0.0.0/4 멀티캐스트, 240.0.0.0/4 예약, 브로드캐스트
    }

    private static boolean hasCause(Throwable t, Class<? extends Throwable> type) {
        for (Throwable c = t; c != null; c = c.getCause()) {
            if (type.isInstance(c)) return true;
        }
        return false;
    }

    static final class BlockedAddressException extends UnknownHostException {
        BlockedAddressException(String host) {
            super("Blocked address for host: " + host);
        }
    }

    private OgMetadata parse(Document doc) {
        String title = getOgOrFallback(doc, "og:title", "title");
        String description = getOgOrFallback(doc, "og:description", null);
        return new OgMetadata(title, absoluteHttpImage(doc), description);
    }

    // og:image가 상대 경로여도 최종 URL 기준 절대 경로로 바꾸고, http/https가 아니면 버림
    private String absoluteHttpImage(Document doc) {
        var el = doc.selectFirst("meta[property=og:image]");
        if (el == null) el = doc.selectFirst("meta[name=og:image]");
        if (el == null) return null;
        String abs = el.absUrl("content");
        String lower = abs.toLowerCase(Locale.ROOT);
        return lower.startsWith("http://") || lower.startsWith("https://") ? abs : null;
    }

    private String getOgOrFallback(Document doc, String property, String fallbackTag) {
        String value = getMeta(doc, property);
        if (value != null) return value;
        if (fallbackTag != null) {
            var el = doc.selectFirst(fallbackTag);
            return el != null ? el.text() : null;
        }
        return null;
    }

    private String getMeta(Document doc, String property) {
        var el = doc.selectFirst("meta[property=" + property + "]");
        if (el != null) return el.attr("content");
        el = doc.selectFirst("meta[name=" + property + "]");
        return el != null ? el.attr("content") : null;
    }
}
