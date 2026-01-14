<?php
// backend/config/db.php

declare(strict_types=1);
$host = '127.0.0.1';
$db = 'video_platform';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host={$host};dbname={$db};charset={$charset}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // throw error
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // fetch() dizi dondur
    PDO::ATTR_EMULATE_PREPARES   => false, // gercek prepare
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch(PDOException $e) {
    die("DB connection error: ".$e->getMessage());
}