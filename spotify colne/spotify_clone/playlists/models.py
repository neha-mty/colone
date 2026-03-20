from django.db import models
from accounts.models import CustomUser
from music.models import Song


class Playlist(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='playlists')
    songs = models.ManyToManyField(Song, related_name='playlists', blank=True)
    cover_image = models.ImageField(upload_to='playlist_covers/', blank=True, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def total_duration(self):
        total = sum(s.duration for s in self.songs.all())
        mins, secs = divmod(total, 60)
        return f"{mins}:{secs:02d}"
