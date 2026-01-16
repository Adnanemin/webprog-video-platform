<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']['id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not logged in']);
  exit;
}
if ((int)($_SESSION['user']['is_admin'] ?? 0) !== 1) {
  http_response_code(403);
  echo json_encode(['error' => 'Admin only']);
  exit;
}

require __DIR__ . '/../../config/db.php';

try {
  // adminler listede görünmesin istiyorsun:
  $stmt = $pdo->query("SELECT id, first_name, last_name, username, email
                       FROM users
                       WHERE is_admin = 0
                       ORDER BY id DESC");
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'users' => $users]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Server error']);
}