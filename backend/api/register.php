<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Only POST is allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

$firstName = trim($_POST['first_name'] ?? '');
$lastName  = trim($_POST['last_name'] ?? '');
$username  = trim($_POST['username'] ?? '');
$email     = trim($_POST['email'] ?? '');
$password  = (string)($_POST['password'] ?? '');

// Accept both naming styles: confirm_password (recommended) or confirmPassword
$confirmPassword = (string)($_POST['confirm_password'] ?? ($_POST['confirmPassword'] ?? ''));

if ($firstName === '' || $lastName === '' || $username === '' || $email === '' || $password === '' || $confirmPassword === '') {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required']);
    exit;
}

if ($password !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwords do not match']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters long']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email']);
    exit;
}

try {
    $check = $pdo->prepare('SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1');
    $check->execute([':username' => $username, ':email' => $email]);

    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Username or email already exists']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare(
        'INSERT INTO users (first_name, last_name, username, email, password, is_admin)
         VALUES (:first_name, :last_name, :username, :email, :password, :is_admin)'
    );

    $stmt->execute([
        ':first_name' => $firstName,
        ':last_name'  => $lastName,
        ':username'   => $username,
        ':email'      => $email,
        ':password'   => $hash,
        ':is_admin'   => 0
    ]);

    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Registered successfully']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}