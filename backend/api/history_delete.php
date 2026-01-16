<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

require __DIR__ . '/../db.php';

$userId = $_SESSION['user']['id'];

// Clear all history
if (isset($_POST['clear_all'])) {
    $stmt = $pdo->prepare("DELETE FROM history WHERE user_id = ?");
    $stmt->execute([$userId]);

    echo json_encode(['success' => true]);
    exit;
}

// Delete single video from history
$videoId = $_POST['video_id'] ?? null;
if (!$videoId) {
    http_response_code(400);
    echo json_encode(['error' => 'video_id required']);
    exit;
}

$stmt = $pdo->prepare(
    "DELETE FROM history WHERE user_id = ? AND video_id = ?"
);
$stmt->execute([$userId, $videoId]);

echo json_encode(['success' => true]);