<?php
declare(strict_types=1);

// Start session
session_start();

// Return JSON
header('Content-Type: application/json; charset=utf-8');

// If user is not logged in
if (!isset($_SESSION['user'])){
    echo json_encode([
        'logged_in' => false,
        'user' => null
    ]);
    exit;
}

// User is logged in
echo json_encode([
    'logged_in' => true,
    'user' => [
        'id' => $_SESSION['user']['id'] ?? null,
        'first_name' => $_SESSION['user']['first_name'] ?? null,
        'last_name' => $_SESSION['user']['last_name'] ?? null,
        'username' => $_SESSION['user']['username'] ?? null,
        'email' => $_SESSION['user']['email'] ?? null
    ]
]);