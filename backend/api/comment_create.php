<?php
declare(strict_types=1);

// Start session
session_start();

// Return JSON responses
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

// Only POST requests are allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST'){
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

// Check login
if(!isset($_SESSION['user'])){
    http_response_code(403);
    echo json_encode(['error' => 'You must be logged in to comment']);
    exit;
}

// Read input
$videoId = isset($_POST['video_id']) ? (int) $_POST['video_id'] : 0;
$content = trim($_POST['content'] ?? '');

if ($videoId <= 0 || $content === ''){
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$userId = (int) $_SESSION['user']['id'];

try{
    $sql = "
        INSERT INTO comments (video_id, user_id, content)
        VALUES (:video_id, :user_id, :content)
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':video_id' => $videoId,
        ':user_id' => $userId,
        ':content' => $content
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Comment added successfully'
    ]);
} catch(PDOException $e){
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}