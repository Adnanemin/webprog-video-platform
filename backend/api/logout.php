<?php
declare(strict_types=1);

// Start session
session_start();

// Return JSON
header('Content-Type: application/json; charset=utf-8');

// Clear session data
$_SESSION = [];

// If a session cookie exists, expire it
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// Destroy the session
session_destroy();

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);