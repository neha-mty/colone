import requests

# Test 1 - artists with correct image param
r = requests.get('https://api.jamendo.com/v3.0/artists', params={
    'client_id': '6c2a581a',
    'format': 'json',
    'limit': 3,
    'order': 'popularity_total',
    'imagesize': '200',
})
data = r.json()
a = data['results'][0]
print('=== ARTIST ===')
print('Name:', a['name'])
print('Image:', a.get('image', 'EMPTY'))

# Test 2 - tracks
r2 = requests.get('https://api.jamendo.com/v3.0/tracks', params={
    'client_id': '6c2a581a',
    'format': 'json',
    'limit': 3,
    'order': 'popularity_week',
    'imagesize': '200',
})
data2 = r2.json()
t = data2['results'][0]
print('\n=== TRACK ===')
print('Name:', t['name'])
print('Artist:', t['artist_name'])
print('Image:', t.get('image', 'EMPTY'))
print('Audio:', t.get('audio', 'EMPTY'))
print('Keys:', list(t.keys()))python test.py