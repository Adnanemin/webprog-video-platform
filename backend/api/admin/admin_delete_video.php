<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../../config/db.php';

/* Allow only POST requests */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

/* Require login */
if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'You must be logged in']);
    exit;
}

/* Require admin */
if ((int)($_SESSION['user']['is_admin'] ?? 0) !== 1) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

$videoId = (int)($_POST['video_id'] ?? 0);
if ($videoId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid video_id']);
    exit;
}

/* Fetch video paths before deleting */
$stmt = $pdo->prepare("
    SELECT id, video_path, thumbnail_path
    FROM videos
    WHERE id = ?
    LIMIT 1
");
$stmt->execute([$videoId]);
$video = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$video) {
    http_response_code(404);
    echo json_encode(['error' => 'Video not found']);
    exit;
}

$pdo->beginTransaction();

try {
    /* Delete dependent rows first */
    $stmt = $pdo->prepare('DELETE FROM watch_history WHERE video_id = ?');
    $stmt->execute([$videoId]);

    /* Delete video row */
    $stmt = $pdo->prepare('DELETE FROM videos WHERE id = ?');
    $stmt->execute([$videoId]);

    $pdo->commit();

    /* Delete files from filesystem (best effort) */
    $root = realpath(__DIR__ . '/../../../'); // project root
    if (!empty($video['video_path'])) {
        @unlink($root . '/frontend/' . $video['video_path']);
    }
    if (!empty($video['thumbnail_path'])) {
        @unlink($root . '/frontend/' . $video['thumbnail_path']);
    }

    echo json_encode([
        'success' => true,
        'video_id' => $videoId,
        'message' => 'Video deleted by admin'
    ]);

} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('admin_delete_video error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}