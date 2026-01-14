<?php
require __DIR__ . '/../config/db.php';

$stmt = $pdo->query("SELECT id, username, email FROM users ORDER BY id");
$users = $stmt->fetchAll();

header('Content-Type: application/json; charset=utf-8');
echo json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);