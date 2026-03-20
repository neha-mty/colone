from django.urls import path
from . import views

urlpatterns = [
    
    path('', views.my_playlists, name='my_playlists'),
    path('<int:pk>/', views.playlist_detail, name='playlist_detail'),
    path('create/', views.create_playlist, name='create_playlist'),
    path('<int:pk>/delete/', views.delete_playlist, name='delete_playlist'),
    path('<int:playlist_pk>/add/<int:song_pk>/', views.add_to_playlist, name='add_to_playlist'),
    path('<int:playlist_pk>/remove/<int:song_pk>/', views.remove_from_playlist, name='remove_from_playlist'),
]
