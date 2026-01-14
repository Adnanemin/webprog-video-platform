<?php
require __DIR__ . '/../config/db.php';

$sql = "
SELECT 
  v.id, v.title, v.description, v.video_path, v.thumbnail_path, v.uploaded_at,
  u.username,
  c.name AS category
FROM videos v
JOIN users u ON u.id = v.user_id
LEFT JOIN categories c ON c.id = v.category_id
ORDER BY v.uploaded_at DESC
";

$videos = $pdo->query($sql)->fetchAll();

header('Content-Type: application/json; charset=utf-8');
echo json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);