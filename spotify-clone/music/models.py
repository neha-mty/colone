from django.db import models
from accounts.models import CustomUser


class Genre(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Artist(models.Model):
    name = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to='artists/', blank=True, null=True)
    user = models.OneToOneField(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True
    )

    def __str__(self):
        return self.name


class Album(models.Model):
    title = models.CharField(max_length=255)
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name='albums')
    cover_image = models.ImageField(upload_to='covers/')
    release_date = models.DateField()
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.title} — {self.artist}"


class Song(models.Model):
    title = models.CharField(max_length=255)
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name='songs')
    album = models.ForeignKey(
        Album, on_delete=models.SET_NULL, null=True, blank=True, related_name='songs'
    )
    audio_file = models.FileField(upload_to='songs/', blank=True)
    youtube_id = models.CharField(max_length=20, blank=True, help_text="YouTube video ID, e.g. dQw4w9WgXcQ")
    duration = models.PositiveIntegerField(help_text="Duration in seconds", default=0)
    track_number = models.PositiveIntegerField(default=1)
    play_count = models.PositiveIntegerField(default=0)
    genre = models.ForeignKey(Genre, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    liked_by = models.ManyToManyField(
        CustomUser, related_name='liked_songs', blank=True
    )

    class Meta:
        ordering = ['track_number']

    def __str__(self):
        return self.title

    def duration_display(self):
        mins, secs = divmod(self.duration, 60)
        return f"{mins}:{secs:02d}"
