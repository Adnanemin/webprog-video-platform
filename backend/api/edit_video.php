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

$userId  = (int)$_SESSION['user']['id'];
$videoId = (int)($_POST['video_id'] ?? 0);

$title       = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');

// Accept category by name (preferred). Keep category_id as a backward-compatible fallback.
$categoryName = trim($_POST['category_name'] ?? '');
$categoryId   = (int)($_POST['category_id'] ?? 0);

if ($videoId <= 0 || $title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'video_id and title are required']);
    exit;
}

/* Fetch video and verify ownership */
$stmt = $pdo->prepare("
    SELECT id, user_id, thumbnail_path
    FROM videos
    WHERE id = ?
    LIMIT 1
");
$stmt->execute([$videoId]);
$video = $stmt->fetch(PDO::FETCH_ASSOC);

/* Hide existence of other users' videos */
if (!$video || (int)$video['user_id'] !== $userId) {
    http_response_code(404);
    echo json_encode(['error' => 'Video not found']);
    exit;
}

// Resolve category_name to category_id (if provided)
if ($categoryName !== '') {
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE name = ? LIMIT 1');
    $stmt->execute([$categoryName]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid category_name']);
        exit;
    }

    $categoryId = (int)$row['id'];
}

/* Thumbnail handling (optional) */
$newThumbWebPath = $video['thumbnail_path'];
$oldThumbWebPath = $video['thumbnail_path'];

if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {

    $root = realpath(__DIR__ . '/../../');
    $thumbDir = $root . '/database/thumbnails';

    if (!is_dir($thumbDir)) {
        mkdir($thumbDir, 0775, true);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $thumbMime = $finfo->file($_FILES['thumbnail']['tmp_name']);
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (!in_array($thumbMime, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid thumbnail format']);
        exit;
    }

    $ext = match ($thumbMime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp'
    };

    $thumbName = 't_' . bin2hex(random_bytes(12)) . '.' . $ext;
    $thumbFsPath = $thumbDir . '/' . $thumbName;

    if (!move_uploaded_file($_FILES['thumbnail']['tmp_name'], $thumbFsPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save thumbnail']);
        exit;
    }

    $newThumbWebPath = 'thumbnails/' . $thumbName;
}

/* Update database */
$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare("
        UPDATE videos
        SET title = ?, description = ?, category_id = NULLIF(?,0), thumbnail_path = ?
        WHERE id = ?
    ");

    $stmt->execute([
        $title,
        $description,
        $categoryId,
        $newThumbWebPath,
        $videoId
    ]);

    $pdo->commit();

    /* Delete old thumbnail if replaced */
    if ($oldThumbWebPath && $newThumbWebPath !== $oldThumbWebPath) {
        $root = realpath(__DIR__ . '/../../');
        @unlink($root . '/database/' . $oldThumbWebPath);
    }

    echo json_encode([
        'success' => true,
        'video_id' => $videoId
    ]);

} catch (Throwable $e) {
    $pdo->rollBack();

    /* Cleanup newly uploaded thumbnail on failure */
    if (isset($newThumbWebPath) && $newThumbWebPath !== $oldThumbWebPath) {
        $root = realpath(__DIR__ . '/../../');
        @unlink($root . '/database/' . $newThumbWebPath);
    }

    error_log('edit_video error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}