<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

function json_fail(int $status, string $error, array $extra = []): void {
    http_response_code($status);
    echo json_encode(array_merge(['error' => $error], $extra));
    exit;
}

/* Allow only POST requests */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    json_fail(405, 'Only POST method is allowed');
}

/* Require login */
if (!isset($_SESSION['user']['id'])) {
    json_fail(401, 'You must be logged in');
}

$userId = (int)$_SESSION['user']['id'];

/* Read form fields */
$title       = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$categoryId  = (int)($_POST['category_id'] ?? 0);

if ($title === '') {
    json_fail(400, 'Title is required');
}

/* Validate video file */
if (!isset($_FILES['video'])) {
    json_fail(400, 'Video file is required');
}
if ($_FILES['video']['error'] !== UPLOAD_ERR_OK) {
    // Make the real reason visible (size limits, no file, partial upload, etc.)
    json_fail(400, 'Video upload failed', [
        'upload_error_code' => (int)$_FILES['video']['error']
    ]);
}

/* Project paths */
$root = realpath(__DIR__ . '/../../'); // project root
if ($root === false) {
    error_log('upload_video: failed to resolve project root from ' . __DIR__);
    json_fail(500, 'Server error');
}

$videoDir = $root . '/database/videos';
$thumbDir = $root . '/database/thumbnails';

if (!is_dir($videoDir) && !mkdir($videoDir, 0775, true)) {
    error_log('upload_video: failed to create videos dir: ' . $videoDir);
    json_fail(500, 'Failed to create videos directory');
}
if (!is_dir($thumbDir) && !mkdir($thumbDir, 0775, true)) {
    error_log('upload_video: failed to create thumbnails dir: ' . $thumbDir);
    json_fail(500, 'Failed to create thumbnails directory');
}

if (!is_writable($videoDir)) {
    error_log('upload_video: videos dir not writable: ' . $videoDir);
    json_fail(500, 'Videos directory is not writable');
}

/* Video validation */
$maxVideoSize = 50 * 1024 * 1024; // 50MB
if ($_FILES['video']['size'] > $maxVideoSize) {
    json_fail(400, 'Video file is too large');
}

if (!class_exists('finfo')) {
    error_log('upload_video: finfo class not available');
    json_fail(500, 'Server error');
}
$finfo = new finfo(FILEINFO_MIME_TYPE);
$videoMime = $finfo->file($_FILES['video']['tmp_name']);

if ($videoMime !== 'video/mp4') {
    json_fail(400, 'Only MP4 videos are allowed');
}

/* Save video */
$videoName = 'v_' . bin2hex(random_bytes(12)) . '.mp4';
$videoFsPath = $videoDir . '/' . $videoName;

if (!is_uploaded_file($_FILES['video']['tmp_name'])) {
    error_log('upload_video: tmp file is not a valid uploaded file: ' . ($_FILES['video']['tmp_name'] ?? ''));
    json_fail(500, 'Invalid temp file');
}

if (!move_uploaded_file($_FILES['video']['tmp_name'], $videoFsPath)) {
    error_log('upload_video: move_uploaded_file failed');
    error_log('  tmp_name=' . ($_FILES['video']['tmp_name'] ?? ''));
    error_log('  dest=' . $videoFsPath);
    error_log('  videoDirWritable=' . (is_writable($videoDir) ? 'yes' : 'no'));
    $last = error_get_last();
    if ($last) error_log('  last_error=' . json_encode($last));
    json_fail(500, 'Failed to move uploaded file');
}

$videoWebPath = 'database/videos/' . $videoName;

/* Thumbnail (optional) */
$thumbWebPath = null;

if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {

    $thumbMime = $finfo->file($_FILES['thumbnail']['tmp_name']);
    $allowedThumbs = ['image/jpeg', 'image/png', 'image/webp'];

    if (!in_array($thumbMime, $allowedThumbs, true)) {
        @unlink($videoFsPath);
        json_fail(400, 'Invalid thumbnail format');
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
        error_log('upload_video: failed to save thumbnail to ' . $thumbFsPath);
        json_fail(500, 'Failed to save thumbnail');
    }

    $thumbWebPath = 'database/thumbnails/' . $thumbName;
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