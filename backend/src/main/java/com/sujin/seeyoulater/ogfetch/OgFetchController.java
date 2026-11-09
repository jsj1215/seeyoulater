package com.sujin.seeyoulater.ogfetch;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/og")
public class OgFetchController {

    private final OgFetchService ogFetchService;

    public OgFetchController(OgFetchService ogFetchService) {
        this.ogFetchService = ogFetchService;
    }

    @GetMapping
    public ResponseEntity<?> fetch(@RequestParam String url) {
        try {
            OgMetadata metadata = ogFetchService.fetch(url);
            return ResponseEntity.ok(metadata);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(com.sujin.seeyoulater.auth.ErrorResponse.of(e.getMessage(), 400));
        }
    }
}
