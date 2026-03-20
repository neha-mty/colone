from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from spotifyclone import jamendo_views          # ← NEW

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('music.urls')),
    path('accounts/', include('accounts.urls')),
    path('playlists/', include('playlists.urls')),
    path('search/', include('search.urls')),

    # ── Browse / Jamendo ── NEW
    path('browse/',                        jamendo_views.browse_home,    name='browse_home'),
    path('browse/artists/',                jamendo_views.browse_artists,  name='browse_artists'),
    path('browse/artist/<int:artist_id>/', jamendo_views.artist_detail,   name='jamendo_artist'),
    path('browse/album/<int:album_id>/',   jamendo_views.album_detail,    name='jamendo_album'),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)