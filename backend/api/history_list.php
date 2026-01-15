<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['error' => 'You must be logged in']);
    exit;
}

$userId = (int)($_SESSION['user']['id'] ?? 0);
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user']);
    exit;
}

// Optional query params
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
if ($limit <= 0 || $limit > 200) $limit = 50;

try {
    $stmt = $pdo->prepare(
        'SELECT h.id, h.video_id, h.watched_at,
                v.title, v.thumbnail_path, v.video_path,
                c.name AS category_name,
                u.username AS uploader_username
         FROM watch_history h
         JOIN videos v ON v.id = h.video_id
         LEFT JOIN categories c ON c.id = v.category_id
         JOIN users u ON u.id = v.user_id
         WHERE h.user_id = :user_id
         ORDER BY h.watched_at DESC
         LIMIT :limit'
    );

    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'history' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}