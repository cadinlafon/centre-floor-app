import { useState } from 'react';
import { db } from '../config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function VideoUpload() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('Recorded Classes');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !vimeoUrl) {
      alert('Title and Vimeo URL are required.');
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, 'videos'), {
        title,
        description,
        instructor,
        duration,
        category,
        thumbnailUrl,
        vimeoUrl,
        featured,
        pinned,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        createdAt: serverTimestamp(),
      });

      alert('Video published!');

      navigate('/videos');
    } catch (error) {
      console.error(error);
      alert('Failed to upload video.');
    }

    setLoading(false);
  };

  return (
    <div style={container}>
      <div style={card}>
        <h1>Upload Video</h1>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={textarea}
          />

          <input
            placeholder="Instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            style={input}
          />

          <input
            placeholder="Duration (Example: 52 min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={input}
          />

          <input
            placeholder="Thumbnail URL"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            style={input}
          />

          <input
            placeholder="Vimeo URL"
            value={vimeoUrl}
            onChange={(e) => setVimeoUrl(e.target.value)}
            style={input}
          />

          <input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={input}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={input}
          >
            <option>Recorded Classes</option>
          </select>

          <label style={checkboxRow}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured Video
          </label>

          <label style={checkboxRow}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin To Top
          </label>

          <button style={button} disabled={loading}>
            {loading ? 'Publishing...' : 'Publish Video'}
          </button>
        </form>
      </div>
    </div>
  );
}

const container = {
  padding: '24px',
  maxWidth: '900px',
  margin: '0 auto'
};

const card = {
  background: '#fff',
  padding: '24px',
  borderRadius: '12px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
};

const input = {
  width: '100%',
  padding: '12px',
  marginBottom: '12px',
  borderRadius: '8px',
  border: '1px solid #ddd'
};

const textarea = {
  width: '100%',
  minHeight: '120px',
  padding: '12px',
  marginBottom: '12px',
  borderRadius: '8px',
  border: '1px solid #ddd'
};

const checkboxRow = {
  display: 'flex',
  gap: '10px',
  marginBottom: '12px'
};

const button = {
  width: '100%',
  padding: '14px',
  background: '#8b5a2b',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer'
};