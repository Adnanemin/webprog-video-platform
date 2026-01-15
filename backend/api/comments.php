<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Only GET is allowed
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

$videoId = isset($_GET['video_id']) ? (int)$_GET['video_id'] : 0;
if ($videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid video_id']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'SELECT c.id, c.content, c.user_id, c.video_id, c.created_at,
                u.username
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.video_id = :video_id
         ORDER BY c.created_at DESC'
    );

    $stmt->execute([':video_id' => $videoId]);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'comments' => $comments]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}