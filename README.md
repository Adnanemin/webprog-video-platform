# webprog-video-platform
🎬 WeTube – Video Platform

A simple video-sharing web application developed for a Web Programming course.
Users can register, upload videos, watch content, and manage their own videos.

⸻

📌 Features
	•	User registration and login
	•	Upload videos with optional thumbnails
	•	View video list and watch videos
	•	Edit and delete uploaded videos
	•	Category selection for videos
	•	Comment system
	•	Watch history tracking
	•	Admin panel for managing users and videos

⸻

🛠️ Technologies Used

Frontend
	•	HTML
	•	CSS
	•	JavaScript (Vanilla JS)

Backend
	•	PHP
	•	MySQL (Database)


Project Structure

frontend/
  ├── index.html
  ├── video.html
  ├── myaccount.html
  ├── accountdashboard.html
  ├── css/
  ├── js/
  ├── thumbnails/
  └── videos/

backend/
  └── api/
      ├── upload_video.php
      ├── edit_video.php
      ├── login.php
      ├── register.php
      └── ...

database/
  ├── videos/
  └── thumbnails/


⚙️ How It Works

The frontend communicates with the backend using REST-like API endpoints.
JavaScript sends HTTP requests (GET/POST) to PHP files, which interact with the database.

Example:
	•	videos_list.php → returns video list
	•	upload_video.php → uploads a video
	•	edit_video.php → edits video data

The frontend then dynamically updates the UI based on the response.


⸻

▶️ Running the Project
	1.	Place the project inside htdocs (XAMPP)
	2.	Start Apache and MySQL
	3.	Import the database
	4.	Open in browser:
    http://localhost/webprog-video-platform/


👥 Authors
	•	Frontend: 
	•	Backend: 

⸻

📌 Notes

This project was created for educational purposes and demonstrates basic full-stack web development using PHP and JavaScript.