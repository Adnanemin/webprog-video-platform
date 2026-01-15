<?php
declare(strict_types=1);

// Return JSON responses
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Read and validate video_id
$videoId = isset($_GET['video_id']) ? (int) $_GET['video_id'] : 0;

if ($videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid video_id']);
    exit;
}

try {
    $sql = "
        SELECT
            c.id,
            c.content,
            c.created_at,
            u.username
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.video_id = :video_id
        ORDER BY c.created_at DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':video_id' => $videoId]);
    $comments = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode($comments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
