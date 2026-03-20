from django.contrib import admin
from .models import Genre, Artist, Album, Song


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ['name', 'user']
    search_fields = ['name']


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'release_date', 'genre']
    search_fields = ['title', 'artist__name']
    list_filter = ['genre', 'release_date']


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist', 'album', 'duration_display', 'play_count']
    search_fields = ['title', 'artist__name']
    list_filter = ['genre', 'artist']
