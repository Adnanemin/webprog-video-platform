<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

try {
    $stmt = $pdo->query(
        "SELECT id, title, description, video_path, thumbnail_path, uploaded_at, v.category_id, c.name AS category_name
         FROM videos
         JOIN categories c ON c.id = v.category_id
         ORDER BY uploaded_at DESC"
    );

    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'videos' => $videos]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}