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

$first = trim($_POST['first_name'] ?? '');
$last = trim($_POST['last_name'] ?? '');
$username = trim($_POST['username'] ?? '');
$email = trim($_POST['email'] ?? '');

if ($first === '' || $last === '' || $username === '' || $email === ''){
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)){
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email']);
    exit;
}

// Is username unique
$stmt = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ? LIMIT 1");
$stmt->execute([$username, $email, $userId]);

if($stmt->fetch()){
    http_response_code(409);
    echo json_encode(['error' => 'Username or email already in use']);
    exit;
}


$stmt = $pdo->prepare("UPDATE users SET first_name=?, last_name=?, username=?, email=? WHERE id=?");
$stmt->execute([$first, $last, $username, $email, $userId]);

// Update SESSION
$_SESSION['user']['first_name'] = $first;
$_SESSION['user']['last_name'] = $last;
$_SESSION['user']['username'] = $username;
$_SESSION['user']['email'] = $email;

echo json_encode(['success' => true]);