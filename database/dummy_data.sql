USE video_platform;

-- Users
INSERT INTO users (username, email, password) VALUES
('adnan', 'adnan@mail.com', '123456'),
('nazli', 'nazli@mail.com', 'nazli123'),
('testuser', 'test@mail.com', 'password');

-- Categories
INSERT INTO categories (name) VALUES
('Music'),
('Education'),
('Gaming'),
('Vlog');

-- Videos
INSERT INTO videos (title, description, video_path, thumbnail_path, user_id, category_id) VALUES
(
  'My First Video',
  'This is a demo video for testing.',
  'uploads/videos/video1.mp4',
  'uploads/thumbnails/thumb1.jpg',
  1,
  1
),
(
  'Learning PHP Basics',
  'Introductory PHP tutorial.',
  'uploads/videos/video2.mp4',
  'uploads/thumbnails/thumb2.jpg',
  1,
  2
),
(
  'Gaming Highlights',
  'Best moments from gameplay.',
  'uploads/videos/video3.mp4',
  'uploads/thumbnails/thumb3.jpg',
  2,
  3
);

-- Comments
INSERT INTO comments (content, user_id, video_id) VALUES
('Great video!', 2, 1),
('Very helpful, thanks!', 1, 2),
('Nice gameplay 🔥', 1, 3);