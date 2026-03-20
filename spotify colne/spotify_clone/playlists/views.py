from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Playlist
from music.models import Song


@login_required
def my_playlists(request):
    playlists = request.user.playlists.all()
    return render(request, 'playlists/my_playlists.html', {'playlists': playlists})


@login_required
def playlist_detail(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk)
    return render(request, 'playlists/playlist_detail.html', {'playlist': playlist})


@login_required
def create_playlist(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        if name:
            Playlist.objects.create(name=name, owner=request.user)
        return redirect('my_playlists')
    return render(request, 'playlists/create.html')


@login_required
def delete_playlist(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk, owner=request.user)
    playlist.delete()
    return redirect('my_playlists')


@login_required
def add_to_playlist(request, playlist_pk, song_pk):
    playlist = get_object_or_404(Playlist, pk=playlist_pk, owner=request.user)
    song = get_object_or_404(Song, pk=song_pk)
    playlist.songs.add(song)
    return JsonResponse({'status': 'added'})


@login_required
def remove_from_playlist(request, playlist_pk, song_pk):
    playlist = get_object_or_404(Playlist, pk=playlist_pk, owner=request.user)
    song = get_object_or_404(Song, pk=song_pk)
    playlist.songs.remove(song)
    return JsonResponse({'status': 'removed'})
