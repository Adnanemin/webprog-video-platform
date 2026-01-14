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
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

// Validation
if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password required!']);
    exit;
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

try {
    //Fetch user by email
    $stmt = $pdo->prepare(
        "SELECT id, username, email, password
        FROM users
        WHERE email = :email"
    );
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    // If user does not exist
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'There is no account!ß']);
        exit;
    }

    // Verify hashed password
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password!']);
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
} catch (PDOException $e){
    // Database or server error
    http_response_code(500);
    echo json_encode(["error" => "Server error"]);
}