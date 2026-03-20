from django.shortcuts import render
from music.models import Song, Album, Artist


def search(request):
    query = request.GET.get('q', '').strip()
    songs = albums = artists = []
    if query:
        songs = Song.objects.filter(title__icontains=query).select_related('artist', 'album')
        albums = Album.objects.filter(title__icontains=query).select_related('artist')
        artists = Artist.objects.filter(name__icontains=query)
    return render(request, 'search/results.html', {
        'query': query,
        'songs': songs,
        'albums': albums,
        'artists': artists,
    })
