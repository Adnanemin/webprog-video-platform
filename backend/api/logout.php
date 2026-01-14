<?php
declare(strict_types=1);

// Start session
session_start();

// Return JSON
header('Content-Type: application/json; charset=utf-8');

// Clear session data
$_SESSION = [];

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);