<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

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

$userId = (int)($_SESSION['user']['id'] ?? 0);
$videoId = isset($_POST['video_id']) ? (int)$_POST['video_id'] : 0;

if ($userId <= 0 || $videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user_id or video_id']);
    exit;
}

try {
    // Optional: verify video exists (nice 404)
    $check = $pdo->prepare('SELECT id FROM videos WHERE id = :id LIMIT 1');
    $check->execute([':id' => $videoId]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Video not found']);
        exit;
    }

    // Simple approach: always insert a new history row
    $stmt = $pdo->prepare(
        'INSERT INTO watch_history (user_id, video_id)
         VALUES (:user_id, :video_id)'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':video_id' => $videoId
    ]);

    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'History added']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}