import axios from 'axios';

let accessToken = '';
let tokenExpiresAt = 0;

export default async function handler(req, res) {
  const { query } = req.query;

  if (!query) return res.status(400).json({ error: 'Missing query' });

  if (!accessToken || Date.now() >= tokenExpiresAt) {
    const auth = Buffer.from(
      process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
    ).toString('base64');

    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = tokenRes.data.access_token;
    tokenExpiresAt = Date.now() + tokenRes.data.expires_in * 1000;
  }

  try {
    const spotifyRes = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    const tracks = spotifyRes.data.tracks.items.map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      preview_url: track.preview_url,
      album_image: track.album.images[0]?.url
    }));

    res.status(200).json(tracks);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Spotify search failed' });
  }
}
