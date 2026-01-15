<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Optional debug: export APP_DEBUG=1 to include error details in JSON
$debug = (getenv('APP_DEBUG') === '1');

// Ensure db.php initialized $pdo
if (!isset($pdo) || !($pdo instanceof PDO)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $debug ? 'Database connection not initialized ($pdo missing)' : null
    ]);
    exit;
}

// Only GET is allowed
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

$videoId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid id']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'SELECT 
            v.id,
            v.title,
            v.description,
            v.video_path,
            v.thumbnail_path,
            v.user_id,
            v.category_id,
            v.uploaded_at AS created_at,
            u.username AS uploader_username,
            c.name AS category_name
         FROM videos v
         JOIN users u ON u.id = v.user_id
         JOIN categories c ON c.id = v.category_id
         WHERE v.id = :id
         LIMIT 1'
    );

    $stmt->execute([':id' => $videoId]);
    $video = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$video) {
        http_response_code(404);
        echo json_encode(['error' => 'Video not found']);
        exit;
    }

    echo json_encode(['success' => true, 'video' => $video]);
} catch (PDOException $e) {
    // Log the real DB error to XAMPP php_error_log
    error_log('video_detail.php PDOException: ' . $e->getMessage());

    http_response_code(500);
    $payload = ['error' => 'Server error'];
    if ($debug) {
        $payload['details'] = $e->getMessage();
    }
    echo json_encode($payload);
}