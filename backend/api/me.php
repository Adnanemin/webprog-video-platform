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
    'user' => $_SESSION['user']
]);