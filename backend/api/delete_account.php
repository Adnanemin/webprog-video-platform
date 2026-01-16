<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']['id'])){
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

require __DIR__ . '/../config/db.php';

$userId = (int)$_SESSION['user']['id'];
$password = $_POST['password'] ?? '';

if($password === ''){
    http_response_code(400);
    echo json_encode(['error' => 'Password is required']);
    exit;
}

// Fetch current password hash
$stmt = $pdo->prepare("SELECT password FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if(!$row || empty($row['password']) || !password_verify($password, $row['password'])){
    http_response_code(403);
    echo json_encode(['error' => 'Wrong password']);
    exit;
}

$pdo->beginTransaction();
try{
    $stmt = $pdo->prepare("DELETE FROM watch_history WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);

    $pdo->commit();

    $_SESSION = [];
    if(ini_get("session.use_cookies")){
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
    }
    session_destroy();

    echo json_encode(['success' => true]);
}catch (Throwable $e){
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}