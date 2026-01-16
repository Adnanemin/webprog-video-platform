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

// Read input values (accept multiple naming styles from frontend)
$login = trim((string)(
    $_POST['login'] ??
    $_POST['username'] ??
    $_POST['email'] ??
    $_GET['login'] ??
    $_GET['username'] ??
    $_GET['email'] ??
    ''
)); // can be username or email

// Keep raw password presence so we can distinguish "not sent" vs "sent empty"
$passwordRaw = $_POST['password'] ?? null;
$password = (string)($passwordRaw ?? '');

// Optional: existence check mode (used by register page)
// Only enabled when the client explicitly sends check_only=1.
$checkOnly = (string)(
    $_POST['check_only'] ??
    $_GET['check_only'] ??
    ''
);

if ($checkOnly === '1') {
    // For register pre-check: do NOT require password, do NOT log in.
    if ($login === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Login required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            "SELECT id
             FROM users
             WHERE email = :login_email OR username = :login_username
             LIMIT 1"
        );
        $stmt->execute([
            ':login_email' => $login,
            ':login_username' => $login
        ]);

        $exists = (bool)$stmt->fetch();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'exists' => $exists
        ]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
        exit;
    }
}

// Validation
if ($login === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Login and password required!']);
    exit;
}

try {
    //Fetch user by username or email
    $stmt = $pdo->prepare(
        "SELECT id, first_name, last_name, username, email, password, is_admin
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
        'id' => (int)$user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'is_admin' => (int)($user['is_admin'] ?? 0)
    ];

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'is_admin' => (int)($user['is_admin'] ?? 0)
        ]
    ]);
} catch (PDOException $e) {
    // Database or server error (debug details for development)
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error'
    ]);
}