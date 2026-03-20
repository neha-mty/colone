from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .models import Song, Album, Artist


def home(request):
    songs = Song.objects.order_by('-play_count')[:10]
    albums = Album.objects.order_by('-release_date')[:6]
    artists = Artist.objects.all()[:6]
    return render(request, 'music/home.html', {
        'songs': songs,
        'albums': albums,
        'artists': artists,
    })


def album_detail(request, pk):
    album = get_object_or_404(Album, pk=pk)
    return render(request, 'music/album_detail.html', {'album': album})


def artist_detail(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    return render(request, 'music/artist_detail.html', {'artist': artist})


@login_required
def like_song(request, pk):
    song = get_object_or_404(Song, pk=pk)
    if request.user in song.liked_by.all():
        song.liked_by.remove(request.user)
        liked = False
    else:
        song.liked_by.add(request.user)
        liked = True
    return JsonResponse({'liked': liked, 'count': song.liked_by.count()})


@require_POST
def increment_play(request, pk):
    song = get_object_or_404(Song, pk=pk)
    song.play_count += 1
    song.save()
    return JsonResponse({'play_count': song.play_count})


@login_required
def liked_songs(request):
    songs = request.user.liked_songs.all()
    return render(request, 'music/liked_songs.html', {'songs': songs})
