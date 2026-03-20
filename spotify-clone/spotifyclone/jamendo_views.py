# ============================================================
#  spotifyclone/jamendo_views.py  — FIXED
#  Uses correct Jamendo API fields confirmed by testing:
#  - Tracks have: image, audio, artist_name, album_name
#  - Artists have: name, shorturl (no images in free API)
#  - Albums have: image, name, artist_name
# ============================================================

import requests
from django.shortcuts import render
from django.conf import settings

JAMENDO_BASE = 'https://api.jamendo.com/v3.0'


def _client_id():
    return getattr(settings, 'JAMENDO_CLIENT_ID', '')


def _get(endpoint, params):
    """
    Make a Jamendo API call.
    Returns results list or empty list on any error.
    """
    p = dict(params)
    p['client_id'] = _client_id()
    p['format']    = 'json'

    try:
        resp = requests.get(
            f'{JAMENDO_BASE}/{endpoint}',
            params=p,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get('results', [])
    except Exception as e:
        print(f'[Jamendo] ERROR {endpoint}: {e}')
        return []


# ── 1. BROWSE HOME ──────────────────────────────
def browse_home(request):
    # Trending tracks this week
    trending = _get('tracks', {
        'limit':      20,
        'order':      'popularity_week',
        'imagesize':  300,
    })

    # New releases
    new_tracks = _get('tracks', {
        'limit':      20,
        'order':      'releasedate',
        'imagesize':  300,
    })

    # Featured albums
    featured_albums = _get('albums', {
        'limit':      12,
        'order':      'popularity_total',
        'imagesize':  300,
    })

    return render(request, 'browse/home.html', {
        'trending':        trending,
        'new_tracks':      new_tracks,
        'featured_albums': featured_albums,
    })


# ── 2. BROWSE ARTISTS ───────────────────────────
def browse_artists(request):
    genre = request.GET.get('genre', '').strip()
    query = request.GET.get('q', '').strip()

    # Get tracks — group by artist on the template side
    params = {
        'limit':     100,
        'order':     'popularity_total',
        'imagesize': 300,
    }
    if query:
        params['artist_name'] = query
    if genre:
        params['tags'] = genre

    tracks = _get('tracks', params)

    # Build unique artists list from tracks
    seen = set()
    artists = []
    for t in tracks:
        aid = t.get('artist_id')
        if aid and aid not in seen:
            seen.add(aid)
            artists.append({
                'id':    aid,
                'name':  t.get('artist_name', ''),
                'image': t.get('image', ''),  # album art as stand-in
            })

    genres = [
        'pop', 'rock', 'electronic', 'jazz', 'classical',
        'hiphop', 'metal', 'lounge', 'soundtrack', 'world',
        'relaxation', 'songwriter',
    ]

    return render(request, 'browse/artists.html', {
        'artists':        artists,
        'genres':         genres,
        'selected_genre': genre,
        'query':          query,
    })


# ── 3. ARTIST DETAIL ────────────────────────────
def artist_detail(request, artist_id):
    # Get tracks by this artist
    tracks = _get('tracks', {
        'artist_id':  artist_id,
        'limit':      50,
        'order':      'popularity_total',
        'imagesize':  300,
    })

    # Get albums by this artist
    albums = _get('albums', {
        'artist_id': artist_id,
        'limit':     20,
        'imagesize': 300,
        'order':     'releasedate_desc',
    })

    # Build artist info from first track
    artist = {}
    if tracks:
        artist = {
            'id':   tracks[0].get('artist_id', ''),
            'name': tracks[0].get('artist_name', ''),
            'image': tracks[0].get('image', ''),
        }

    return render(request, 'browse/artist_detail.html', {
        'artist': artist,
        'albums': albums,
        'tracks': tracks[:10],  # top 10
    })


# ── 4. ALBUM DETAIL ─────────────────────────────
def album_detail(request, album_id):
    # Get album info
    album_list = _get('albums', {
        'id':        album_id,
        'imagesize': 400,
    })
    album = album_list[0] if album_list else {}

    # Get tracks for this album
    tracks = _get('tracks', {
        'album_id':  album_id,
        'limit':     50,
        'imagesize': 300,
    })

    return render(request, 'browse/album_detail.html', {
        'album':  album,
        'tracks': tracks,
    })