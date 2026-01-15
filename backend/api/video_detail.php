<?php
declare(strict_types=1);

// Return JSON responses
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Check video id
$videoId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if ($videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid video id']);
    exit;
}

try {
    $sql = "
        SELECT
            v.id,
            v.title,
            v.description,
            v.video_path,
            v.thumbnail_path,
            v.uploaded_at,
            u.username,
            c.name AS category
        FROM videos v
        JOIN users u ON u.id = v.user_id
        LEFT JOIN categories c ON c.id = v.category_id
        WHERE v.id = :id
        LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $videoId]);
    $video = $stmt->fetch();

    // If video not found
    if (!$video){
        http_response_code(404);
        echo json_encode(['error' => 'Video not found']);
        exit;
    }

    // Success
    http_response_code(200);
    echo json_encode($video, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}