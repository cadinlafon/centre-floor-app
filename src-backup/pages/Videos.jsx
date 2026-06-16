import { useEffect, useState } from 'react';
import { db } from '../config';
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'videos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];

      snapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });

      items.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });

      setVideos(items);
    });

    return () => unsubscribe();
  }, []);

  const filteredVideos = videos.filter((video) =>
    video.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>Recorded Classes</h2>

      <input
        type="text"
        placeholder="Search videos..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}
      />

      {filteredVideos.map((video) => (
        <div
          key={video.id}
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            style={{
              width: '100%',
              height: '220px',
              objectFit: 'cover'
            }}
          />

          <div style={{ padding: '16px' }}>
            <h3>{video.title}</h3>

            <p>{video.description}</p>

            <div>
              <strong>Instructor:</strong> {video.instructor}
            </div>

            <div>
              <strong>Duration:</strong> {video.duration}
            </div>

            <iframe
              src={video.videoUrl}
              width="100%"
              height="400"
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
              title={video.title}
              style={{
                marginTop: '12px',
                borderRadius: '10px'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}