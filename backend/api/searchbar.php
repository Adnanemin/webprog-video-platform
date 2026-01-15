<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

// search terimini iki isimle de kabul edelim: q veya search
$q = trim((string)($_GET['q'] ?? ($_GET['search'] ?? '')));

if ($q === '') {
    // Boş arama gelirse boş liste döndürelim (istersen tüm videoları da döndürebiliriz)
    echo json_encode(['success' => true, 'videos' => []]);
    exit;
}

try {
    $like = "%{$q}%";

    $stmt = $pdo->prepare(
        "SELECT id, title, description, video_path, thumbnail_path, uploaded_at
         FROM videos
         WHERE title LIKE :q OR COALESCE(description,'') LIKE :q
         ORDER BY uploaded_at DESC"
    );

    $stmt->execute([':q' => $like]);
    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'videos' => $videos]);
} catch (PDOException $e) {
    error_log('searchbar.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}