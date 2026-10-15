<?php

if (getenv('CI') !== 'true' || getenv('GITHUB_ACTIONS') !== 'true') {
    throw new RuntimeException('Supporting-service acceptance requires disposable GitHub CI.');
}
require __DIR__.'/../../apps/api/vendor/autoload.php';
$environment = Dotenv\Dotenv::parse(file_get_contents(__DIR__.'/../../.env'));
$http = new GuzzleHttp\Client(['timeout' => 15, 'http_errors' => false]);
$check = static function (bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
};
foreach (['http://127.0.0.1:9000/minio/health/ready', 'http://127.0.0.1:7700/health', 'http://127.0.0.1:8025/api/v1/info'] as $url) {
    $ready = false;
    for ($attempt = 0; $attempt < 30; $attempt++) {
        try {
            if ($http->get($url)->getStatusCode() === 200) {
                $ready = true;
                break;
            }
        } catch (GuzzleHttp\Exception\GuzzleException) {
        }
        sleep(1);
    }
    $check($ready, 'Supporting HTTP service did not become ready.');
}
$s3 = new Aws\S3\S3Client(['version' => 'latest', 'region' => 'us-east-1', 'endpoint' => 'http://127.0.0.1:9000', 'use_path_style_endpoint' => true, 'credentials' => ['key' => $environment['MINIO_ROOT_USER'], 'secret' => $environment['MINIO_ROOT_PASSWORD']]]);
$bucket = 'simeyo-ci-'.bin2hex(random_bytes(6));
$s3->createBucket(['Bucket' => $bucket]);
try {
    $bytes = "Simeyo private synthetic media\n";
    $s3->putObject(['Bucket' => $bucket, 'Key' => 'private-fixture.txt', 'Body' => $bytes]);
    $check((string) $s3->getObject(['Bucket' => $bucket, 'Key' => 'private-fixture.txt'])['Body'] === $bytes, 'S3 object round trip differs.');
    $check($http->get('http://127.0.0.1:9000/'.$bucket.'/private-fixture.txt')->getStatusCode() === 403, 'Unauthenticated S3 object was exposed.');
} finally {
    $s3->deleteObject(['Bucket' => $bucket, 'Key' => 'private-fixture.txt']);
    $s3->deleteBucket(['Bucket' => $bucket]);
}
$check($http->get('http://127.0.0.1:7700/indexes')->getStatusCode() === 401, 'Search index administration did not require authentication.');
$headers = ['Authorization' => 'Bearer '.$environment['MEILI_MASTER_KEY']];
$task = static function ($response) use ($http, $headers, $check): void {
    $check($response->getStatusCode() === 202, 'Search mutation was not accepted.');
    $id = json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR)['taskUid'];
    for ($attempt = 0; $attempt < 60; $attempt++) {
        $result = $http->get('http://127.0.0.1:7700/tasks/'.$id, ['headers' => $headers]);
        $check($result->getStatusCode() === 200, 'Cannot inspect search indexing task.');
        $state = json_decode((string) $result->getBody(), true, 512, JSON_THROW_ON_ERROR)['status'];
        if ($state === 'succeeded') {
            return;
        }
        $check(!in_array($state, ['failed', 'canceled'], true), 'Search indexing task failed.');
        usleep(250000);
    }
    throw new RuntimeException('Search indexing task timed out.');
};
$index = 'simeyo_ci_'.bin2hex(random_bytes(6));
$task($http->post('http://127.0.0.1:7700/indexes', ['headers' => $headers, 'json' => ['uid' => $index, 'primaryKey' => 'id']]));
try {
    $task($http->post('http://127.0.0.1:7700/indexes/'.$index.'/documents', ['headers' => $headers, 'json' => [['id' => 1, 'body' => 'Synthetic campus conversation']]]));
    $search = $http->post('http://127.0.0.1:7700/indexes/'.$index.'/search', ['headers' => $headers, 'json' => ['q' => 'campus']]);
    $check($search->getStatusCode() === 200 && (json_decode((string) $search->getBody(), true, 512, JSON_THROW_ON_ERROR)['hits'][0]['id'] ?? null) === 1, 'Search indexing/read round trip differs.');
} finally {
    $task($http->delete('http://127.0.0.1:7700/indexes/'.$index, ['headers' => $headers]));
}
echo "Supporting services passed: Mailpit HTTP, private S3 put/get/anonymous denial, authenticated search indexing/query and fixture cleanup. Redis round trip was checked by the workflow.\n";
