from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('album/<int:pk>/', views.album_detail, name='album_detail'),
    path('artist/<int:pk>/', views.artist_detail, name='artist_detail'),
    path('song/<int:pk>/like/', views.like_song, name='like_song'),
    path('song/<int:pk>/play/', views.increment_play, name='increment_play'),
    path('liked/', views.liked_songs, name='liked_songs'),
]
