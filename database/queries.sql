USE video_platform;

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------
-- USERS
-- -------------------------
INSERT INTO users (first_name, last_name, username, email, password, is_admin) VALUES
('Adnan', 'Nalcaci', 'adnan', 'adnan@mail.com', '$2y$10$7FYce8/UEbtVbBrLR9MjBOelXNdp1jeAYPEganF41iffszJ4xXB7O', 1),
('Nazli', 'Coskun', 'nazli', 'nazli@mail.com', '$2y$10$7FYce8/UEbtVbBrLR9MjBOelXNdp1jeAYPEganF41iffszJ4xXB7O', 1),
('Test', 'User', 'testuser', 'test@mail.com', '$2y$10$7FYce8/UEbtVbBrLR9MjBOelXNdp1jeAYPEganF41iffszJ4xXB7O', 0);

-- -------------------------
-- CATEGORIES
-- -------------------------

-- Nature
INSERT INTO categories (name)
SELECT 'Nature' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Nature');

-- Fun
INSERT INTO categories (name)
SELECT 'Fun' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Fun');

-- Education
INSERT INTO categories (name)
SELECT 'Education' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name='Education');

-- -------------------------
-- VIDEOS
-- -------------------------

-- Bird
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Bird',
  'Bird sitting on a branch.',
  'videos/bird.mp4',
  'thumbnails/bird.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'adnan' AND c.name = 'Nature'
LIMIT 1;

-- Calming Nature Video
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Calming Nature Video',
  'Video of a calming river flowing.',
  'videos/nature.mp4',
  'thumbnails/nature.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'nazli' AND c.name = 'Nature'
LIMIT 1;

-- Snowy Landscape
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Snowy Landscape',
  'Video of a snowy landscape.',
  'videos/snow.mp4',
  'thumbnails/snow.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'adnan' AND c.name = 'Nature'
LIMIT 1;

-- Solar System
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Solar System',
  'A solar system visualization.',
  'videos/space.mp4',
  'thumbnails/space.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'nazli' AND c.name = 'Education'
LIMIT 1;

-- Cute Turtle
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Cute Turtle',
  'Cute turtle swimming.',
  'videos/turtle.mp4',
  'thumbnails/turtle.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'testuser' AND c.name = 'Nature'
LIMIT 1;

-- Waves
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Waves',
  '.',
  'videos/waves.mp4',
  'thumbnails/waves.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'testuser' AND c.name = 'Nature'
LIMIT 1;

-- Ocean
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id)
SELECT
  'Ocean',
  'Ocean',
  'videos/ocean.mp4',
  'thumbnails/ocean.png',
  u.id,
  c.id
FROM users u, categories c
WHERE u.username = 'testuser' AND c.name = 'Nature'
LIMIT 1;

-- -------------------------
-- COMMENTS
-- -------------------------

INSERT INTO comments (content, user_id, video_id)
SELECT 'Great video!', u.id, v.id
FROM users u, videos v
WHERE u.username = 'nazli' AND v.title = 'Bird'
LIMIT 1;

INSERT INTO comments (content, user_id, video_id)
SELECT 'Very helpful, thanks!', u.id, v.id
FROM users u, videos v
WHERE u.username = 'adnan' AND v.title = 'Solar System'
LIMIT 1;

INSERT INTO comments (content, user_id, video_id)
SELECT 'Nice gameplay 🔥', u.id, v.id
FROM users u, videos v
WHERE u.username = 'adnan' AND v.title = 'Waves'
LIMIT 1;


SET FOREIGN_KEY_CHECKS = 1;