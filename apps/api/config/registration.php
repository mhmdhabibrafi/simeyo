<?php

return [
    'enabled' => env('REGISTRATION_ENABLED', true),
    'email_delivery_enabled' => env('EMAIL_DELIVERY_ENABLED', true),
    'email_domains' => array_values(array_filter(array_map(
        fn ($domain) => strtolower(trim($domain)),
        explode(',', (string) env('REGISTRATION_EMAIL_DOMAINS', '')),
    ))),
];
