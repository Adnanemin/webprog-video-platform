<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

/* Allow only POST requests */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed']);
    exit;
}

/* Require login */
if (!isset($_SESSION['user']['id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'You must be logged in']);
    exit;
}

$userId = (int)$_SESSION['user']['id'];

/* Read form fields */
$title       = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$categoryId  = (int)($_POST['category_id'] ?? 0);

if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Title is required']);
    exit;
}

/* Validate video file */
if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Video file is required']);
    exit;
}

/* Project paths */
$root = realpath(__DIR__ . '/../../'); // project root
$videoDir = $root . '/frontend/videos';
$thumbDir = $root . '/frontend/thumbnails';

if (!is_dir($videoDir)) mkdir($videoDir, 0775, true);
if (!is_dir($thumbDir)) mkdir($thumbDir, 0775, true);

/* Video validation */
$maxVideoSize = 50 * 1024 * 1024; // 50MB
if ($_FILES['video']['size'] > $maxVideoSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Video file is too large']);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$videoMime = $finfo->file($_FILES['video']['tmp_name']);

if ($videoMime !== 'video/mp4') {
    http_response_code(400);
    echo json_encode(['error' => 'Only MP4 videos are allowed']);
    exit;
}

/* Save video */
$videoName = 'v_' . bin2hex(random_bytes(12)) . '.mp4';
$videoFsPath = $videoDir . '/' . $videoName;

if (!move_uploaded_file($_FILES['video']['tmp_name'], $videoFsPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save video']);
    exit;
}

$videoWebPath = 'videos/' . $videoName;

/* Thumbnail (optional) */
$thumbWebPath = null;

if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {

    $thumbMime = $finfo->file($_FILES['thumbnail']['tmp_name']);
    $allowedThumbs = ['image/jpeg', 'image/png', 'image/webp'];

    if (!in_array($thumbMime, $allowedThumbs, true)) {
        @unlink($videoFsPath);
        http_response_code(400);
        echo json_encode(['error' => 'Invalid thumbnail format']);
        exit;
    }

    $thumbExt = match ($thumbMime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp'
    };

    $thumbName = 't_' . bin2hex(random_bytes(12)) . '.' . $thumbExt;
    $thumbFsPath = $thumbDir . '/' . $thumbName;

    if (!move_uploaded_file($_FILES['thumbnail']['tmp_name'], $thumbFsPath)) {
        @unlink($videoFsPath);
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save thumbnail']);
        exit;
    }

    $thumbWebPath = 'thumbnails/' . $thumbName;
}

/* Insert into database */
try {
    $stmt = $pdo->prepare("
        INSERT INTO videos
        (title, description, video_path, thumbnail_path, user_id, category_id, uploaded_at)
        VALUES (?, ?, ?, ?, ?, NULLIF(?,0), NOW())
    ");

    $stmt->execute([
        $title,
        $description,
        $videoWebPath,
        $thumbWebPath,
        $userId,
        $categoryId
    ]);

    echo json_encode([
        'success' => true,
        'video_id' => (int)$pdo->lastInsertId()
    ]);

} catch (Throwable $e) {
    @unlink($videoFsPath);
    if ($thumbWebPath) @unlink($thumbFsPath);
    error_log('upload_video error: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}