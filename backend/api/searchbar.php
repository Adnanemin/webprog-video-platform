<?php
// searchbar.php
// Search videos by title/description.
// Returns a JSON list used by the frontend search input.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

function json_fail(int $status, string $error, array $extra = []): void {
    http_response_code($status);
    echo json_encode(array_merge(['success' => false, 'error' => $error], $extra));
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    json_fail(405, 'Only GET method is allowed');
}

$q = trim((string)($_GET['q'] ?? ($_GET['search'] ?? '')));

// Optional limit (sane default)
$limit = (int)($_GET['limit'] ?? 50);
if ($limit <= 0) $limit = 50;
if ($limit > 200) $limit = 200;

// Empty query -> return empty list (do not return all videos)
if ($q === '') {
    echo json_encode(['success' => true, 'videos' => []]);
    exit;
}

// Very short queries can cause expensive full scans.
if (mb_strlen($q) < 2) {
    echo json_encode(['success' => true, 'videos' => []]);
    exit;
}

try {
    $like = "%{$q}%";

    // ---- PDO ----
    if (isset($pdo) && $pdo instanceof PDO) {
        // Join categories to return category name (prevents frontend "category missing" issues)
        // Join users to return uploader username when available
        $sql = "
            SELECT
                v.id,
                v.title,
                v.description,
                v.video_path,
                v.thumbnail_path,
                v.category_id,
                c.name AS category_name,
                v.user_id,
                u.username AS uploader_username,
                v.uploaded_at
            FROM videos v
            LEFT JOIN categories c ON c.id = v.category_id
            LEFT JOIN users u ON u.id = v.user_id
            WHERE v.title LIKE :q
               OR COALESCE(v.description, '') LIKE :q
            ORDER BY v.uploaded_at DESC
            LIMIT :lim
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':q', $like, PDO::PARAM_STR);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'videos' => $videos]);
        exit;
    }

    // ---- mysqli ----
    if (isset($conn) && $conn instanceof mysqli) {
        $sql = "
            SELECT
                v.id,
                v.title,
                v.description,
                v.video_path,
                v.thumbnail_path,
                v.category_id,
                c.name AS category_name,
                v.user_id,
                u.username AS uploader_username,
                v.uploaded_at
            FROM videos v
            LEFT JOIN categories c ON c.id = v.category_id
            LEFT JOIN users u ON u.id = v.user_id
            WHERE v.title LIKE ?
               OR COALESCE(v.description, '') LIKE ?
            ORDER BY v.uploaded_at DESC
            LIMIT ?
        ";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            json_fail(500, 'DB prepare failed');
        }

        $stmt->bind_param('ssi', $like, $like, $limit);
        $stmt->execute();
        $res = $stmt->get_result();
        if (!$res) {
            json_fail(500, 'DB query failed');
        }

        $videos = [];
        while ($row = $res->fetch_assoc()) {
            $videos[] = $row;
        }

        echo json_encode(['success' => true, 'videos' => $videos]);
        exit;
    }

    json_fail(500, 'Database connection not found (expected $pdo or $conn)');

} catch (Throwable $e) {
    error_log('searchbar.php error: ' . $e->getMessage());
    json_fail(500, 'Server error');
}