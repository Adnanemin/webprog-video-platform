<?php
// categories_list.php
// Returns available categories from the database.
// Used by frontend to populate the category <select> during video upload/edit.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Only allow GET
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['error' => 'Only GET method is allowed']);
    exit;
}

// Load DB connection.
// This project may use either PDO ($pdo) or mysqli ($conn). We support both.
require __DIR__ . '/../config/db.php';

// Optional search query (for future use)
$q = trim((string)($_GET['q'] ?? ''));

try {
    $categories = [];

    // ---- PDO ----
    if (isset($pdo) && $pdo instanceof PDO) {
        if ($q !== '') {
            $stmt = $pdo->prepare('SELECT id, name FROM categories WHERE name LIKE :q ORDER BY name ASC');
            $stmt->execute([':q' => '%' . $q . '%']);
        } else {
            $stmt = $pdo->query('SELECT id, name FROM categories ORDER BY name ASC');
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $categories[] = [
                'id' => (int)($r['id'] ?? 0),
                'name' => (string)($r['name'] ?? '')
            ];
        }

        echo json_encode(['categories' => $categories]);
        exit;
    }

    // ---- mysqli ----
    if (isset($conn) && $conn instanceof mysqli) {
        if ($q !== '') {
            $stmt = $conn->prepare('SELECT id, name FROM categories WHERE name LIKE ? ORDER BY name ASC');
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(['error' => 'DB prepare failed']);
                exit;
            }
            $like = '%' . $q . '%';
            $stmt->bind_param('s', $like);
            $stmt->execute();
            $res = $stmt->get_result();
        } else {
            $res = $conn->query('SELECT id, name FROM categories ORDER BY name ASC');
        }

        if (!$res) {
            http_response_code(500);
            echo json_encode(['error' => 'DB query failed']);
            exit;
        }

        while ($row = $res->fetch_assoc()) {
            $categories[] = [
                'id' => (int)($row['id'] ?? 0),
                'name' => (string)($row['name'] ?? '')
            ];
        }

        echo json_encode(['categories' => $categories]);
        exit;
    }

    // If we reach here, db.php did not expose a supported connection.
    http_response_code(500);
    echo json_encode(['error' => 'Database connection not found (expected $pdo or $conn)']);
    exit;

} catch (Throwable $e) {
    // Log the actual error on the server, return a safe message to the client.
    error_log('categories_list.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
    exit;
}
