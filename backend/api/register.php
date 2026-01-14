<?php
declare(strict_types=1);

// Return JSON responses
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../config/db.php';

// Allow only POST requests
if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method is allowed!']);
    exit;
}

// Read input values
$firstName = trim($_POST['first_name'] ?? '');
$lastName  = trim($_POST['last_name'] ?? '');
$username  = trim($_POST['username'] ?? '');
$email     = trim($_POST['email'] ?? '');
$password  = $_POST['password'] ?? '';

// Validation
if ($firstName === '' || $lastName === '' || $username === '' || $email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required!']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if(strlen($password) < 6){
    http_response_code(400);
    echo json_encode(["error" => 'Password must be at least 6 characters!']);
    exit;
}

try{
    $check = $pdo->prepare(
        "SELECT id FROM users WHERE email = :email OR username = :username"
    );
    $check->execute([
        ':email' => $email,
        ':username' => $username
    ]);
    if ($check->fetch()){
        http_response_code(409);
        echo json_encode(['error' => 'Email or username already exists!']);
        exit;
    }
    // Hash the password
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Add users
    $insert = $pdo->prepare(
        "INSERT INTO users(first_name, last_name, username, email, password)
         VALUES (:first_name, :last_name, :username, :email, :password)"
    );
    $insert->execute([
        ":first_name" => $firstName,
        ":last_name"  => $lastName,
        ":username"   => $username,
        ":email"      => $email,
        ":password"   => $passwordHash
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'User registered successfully.'
    ]);
} catch (PDOException $e){
    // Database or server error
    http_response_code(500);
    echo json_encode(['error' => 'Server Error!']);
}