<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  header('Allow: GET');
  http_response_code(405);
  echo json_encode(['error' => 'Only GET method is allowed']);
  exit;
}

if (!isset($_SESSION['user']['id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'You must be logged in']);
  exit;
}

$userId = (int)$_SESSION['user']['id'];

$stmt = $pdo->prepare("
  SELECT 
    v.id,
    v.title,
    v.description,
    v.video_path,
    v.thumbnail_path,
    v.category_id,
    v.uploaded_at,
    c.name AS category_name
  FROM videos v
  LEFT JOIN categories c ON c.id = v.category_id
  WHERE v.user_id = ?
  ORDER BY v.uploaded_at DESC
");
$stmt->execute([$userId]);

echo json_encode([
  'success' => true,
  'videos' => $stmt->fetchAll(PDO::FETCH_ASSOC)
]);