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
        "SELECT 
            v.id,
            v.title,
            v.description,
            v.video_path,
            v.thumbnail_path,
            v.uploaded_at AS created_at,
            v.category_id,
            c.name AS category_name,
            u.username AS uploader_username
        FROM videos v
        JOIN users u ON u.id = v.user_id
        LEFT JOIN categories c ON c.id = v.category_id
        ORDER BY v.uploaded_at DESC"
    );

    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'videos' => $videos]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}