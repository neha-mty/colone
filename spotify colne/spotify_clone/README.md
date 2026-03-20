# Spotifyclone — Django Music Streaming App

A Spotify-inspired music streaming web app built with Python Django.

---

## Quick Start

### 1. Create & activate a virtual environment
```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up your .env
Copy `.env` and update `SECRET_KEY` with any long random string.

### 4. Apply migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create a superuser (admin)
```bash
python manage.py createsuperuser
```

### 6. Run the dev server
```bash
python manage.py runserver
```

Visit:
- **http://127.0.0.1:8000/** — Home page
- **http://127.0.0.1:8000/admin/** — Admin panel (upload artists, albums, songs)

---

## Adding Your First Songs

1. Go to `/admin/`
2. Add a **Genre** (e.g. Pop, Rock)
3. Add an **Artist** (name + optional photo)
4. Add an **Album** (title, artist, cover image, release date)
5. Add a **Song** (title, artist, album, upload an `.mp3` file, set duration in seconds)

Then visit the home page and click any song to start playing!

---

## Project Structure

```
spotifyclone/
├── manage.py
├── requirements.txt
├── .env
├── spotifyclone/       ← Project config (settings, urls)
├── accounts/           ← Auth: register, login, profile
├── music/              ← Songs, Albums, Artists
├── playlists/          ← Playlist management
├── search/             ← Search across songs/albums/artists
├── static/
│   ├── css/main.css    ← Spotify-dark theme
│   └── js/player.js    ← Audio player logic
├── media/              ← Uploaded files (auto-created)
└── templates/
    └── base.html       ← Global layout with persistent player
```

---

## Features

- 🎵 Persistent audio player bar with progress, volume, prev/next
- 🔀 Shuffle & 🔁 Repeat modes
- ⌨️ Keyboard shortcuts (Space = play/pause, Arrow keys = seek/volume)
- ❤️ Like / unlike songs
- 📚 Create & manage playlists
- 🔍 Search songs, albums, artists
- 👤 User accounts with profiles
- 🎤 Artist pages & album pages
- 🔥 Top tracks sorted by play count
- 🛠 Django admin for easy content management

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.x + Django 4.2+ |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | Django Templates + Vanilla JS |
| Styling | Custom CSS (Spotify dark theme) |
| Audio | HTML5 `<audio>` API |
| File storage | Local `media/` folder |

---

## Switching to PostgreSQL (Production)

Update `DATABASES` in `settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'spotifyclone',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```
