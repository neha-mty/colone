import yt_dlp
import requests
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from music.models import Artist, Album, Song, Genre


class Command(BaseCommand):
    help = 'Import a YouTube video or playlist as a song (metadata + thumbnail only)'

    def add_arguments(self, parser):
        parser.add_argument('url',       type=str, help='YouTube video or playlist URL')
        parser.add_argument('--artist',  type=str, default='', help='Override artist name')
        parser.add_argument('--genre',   type=str, default='', help='Genre name')

    def handle(self, *args, **options):
        url         = options['url']
        artist_name = options['artist']
        genre_name  = options['genre']

        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'extract_flat': False,
            'ignoreerrors': True,
        }

        self.stdout.write(f'📡 Fetching metadata from: {url}')

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        if info is None:
            self.stdout.write(self.style.ERROR('Could not fetch info. Check the URL.'))
            return

        # Handle single video vs playlist
        entries = info.get('entries', None)
        if entries:
            items = [e for e in entries if e]  # filter None entries
            self.stdout.write(f'🎵 Found playlist with {len(items)} videos')
        else:
            items = [info]

        imported = 0
        skipped  = 0
        for entry in items:
            result = self._import_song(entry, artist_name, genre_name)
            if result == 'imported':
                imported += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Done! Imported: {imported}  |  Skipped (already exist): {skipped}'
        ))

    def _import_song(self, info, artist_override, genre_name):
        title     = info.get('title')    or 'Unknown Title'
        duration  = int(info.get('duration') or 0)
        thumbnail = info.get('thumbnail') or ''
        uploader  = info.get('uploader') or info.get('channel') or artist_override or 'Unknown Artist'
        yt_id     = info.get('id', '')

        # Use override artist name if provided
        artist_name = artist_override if artist_override else uploader

        # Genre
        genre = None
        if genre_name:
            genre, _ = Genre.objects.get_or_create(name=genre_name)

        # Artist
        artist, created = Artist.objects.get_or_create(name=artist_name)
        if created:
            self.stdout.write(f'  🎤 Created artist: {artist_name}')

        # Album — one "Singles" album per artist
        album, album_created = Album.objects.get_or_create(
            title=f'{artist_name} — Singles',
            artist=artist,
            defaults={'release_date': '2024-01-01', 'genre': genre},
        )

        # Download & attach thumbnail as album cover if not set
        if thumbnail and not album.cover_image:
            try:
                r = requests.get(thumbnail, timeout=10)
                if r.status_code == 200:
                    filename = f'{yt_id}_cover.jpg'
                    album.cover_image.save(filename, ContentFile(r.content), save=True)
                    self.stdout.write(f'  🖼  Saved cover for album: {album.title}')
            except Exception as e:
                self.stdout.write(f'  ⚠  Could not download thumbnail: {e}')

        # Skip if already imported
        if Song.objects.filter(youtube_id=yt_id).exists():
            self.stdout.write(f'  ⏭  Skipped (already exists): {title}')
            return 'skipped'

        # Create Song with youtube_id — no audio file needed
        Song.objects.create(
            title=title,
            artist=artist,
            album=album,
            duration=duration,
            genre=genre,
            youtube_id=yt_id,
            audio_file='',
        )

        self.stdout.write(self.style.SUCCESS(f'  ✅ Imported: {title}  [{duration}s]  ID: {yt_id}'))
        return 'imported'
