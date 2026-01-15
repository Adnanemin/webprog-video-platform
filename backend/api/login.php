<?php
declare(strict_types=1);

// Start session for login state
session_start();

// Return JSON responses
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/db.php';

// Allow only POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed!']);
    exit;
}

// Read input values
$login    = trim($_POST['login'] ?? ''); // can be username or email
$password = $_POST['password'] ?? '';

// Validation
if ($login === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Login and password required!']);
    exit;
}

try {
    //Fetch user by username or email
    $stmt = $pdo->prepare(
        "SELECT id, username, email, password
         FROM users
         WHERE email = :login_email OR username = :login_username
         LIMIT 1"
    );
    $stmt->execute([
        ':login_email' => $login,
        ':login_username' => $login
    ]);
    $user = $stmt->fetch();

    // If user does not exist
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username/email or password!']);
        exit;
    }

    // Verify hashed password
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username/email or password!']);
        exit;
    }

    // Login successful

    // Regenerate session ID to mitigate session fixation
    session_regenerate_id(true);

    // Store minimal user info in session
    $_SESSION['user'] = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email']
    ];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email']
        ]
    ]);
} catch (PDOException $e) {
    // Database or server error (debug details for development)
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}