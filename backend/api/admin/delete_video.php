<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['error' => 'You must be logged in']);
    exit;
}

if ((int)($_SESSION['user']['is_admin'] ?? 0) !== 1) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

$videoId = isset($_POST['video_id']) ? (int)$_POST['video_id'] : 0;
if ($videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid video_id']);
    exit;
}

try {
    $check = $pdo->prepare('SELECT id FROM videos WHERE id = :id LIMIT 1');
    $check->execute([':id' => $videoId]);

    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Video not found']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM videos WHERE id = :id');
    $stmt->execute([':id' => $videoId]);

    echo json_encode([
        'success' => true,
        'message' => 'Video deleted successfully',
        'video_id' => $videoId
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}