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

$userIdToDelete = (int)($_POST['user_id'] ?? 0);
if ($userIdToDelete <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id required']);
    exit;
}

// Prevent deleting yourself from the admin panel
$currentUserId = (int)$_SESSION['user']['id'];
if ($userIdToDelete === $currentUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'You cannot delete your own account here']);
    exit;
}

// Allow deleting only non-admin users.
$stmt = $pdo->prepare('SELECT id, is_admin FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$userIdToDelete]);
$target = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$target) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

// If target is admin
if ((int)($target['is_admin'] ?? 0) === 1) {
    http_response_code(400);
    echo json_encode(['error' => "You cannot delete another admins' account "]);
    exit;
}

$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare('DELETE FROM watch_history WHERE user_id = ?');
    $stmt->execute([$userIdToDelete]);

    // Finally delete the user
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userIdToDelete]);

    $pdo->commit();

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}