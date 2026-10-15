<?php

return [
    'enabled' => env('FIREBASE_AUTH_ENABLED', false),
    'project_id' => env('FIREBASE_PROJECT_ID', 'simeyo'),
    'api_key' => env('FIREBASE_API_KEY', ''),
    'app_id' => env('FIREBASE_APP_ID', ''),
    'auth_domain' => env('FIREBASE_AUTH_DOMAIN', 'simeyo.firebaseapp.com'),
    'institution_slug' => 'uin-suska-riau',
];
