import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Page = styled.div`padding: 1.5rem; max-width: 640px; margin: 0 auto;`;
const Card = styled.div`
  background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px;
  padding: 1.5rem; box-shadow: 0 2px 10px var(--shadow);
`;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.3rem; color: var(--brown-dark); margin: 0 0 1.25rem;`;
const Input = styled.input`
  width: 100%; padding: 0.7rem 0.85rem; margin-bottom: 0.85rem; border-radius: 10px;
  border: 1.5px solid var(--border); font-size: 0.9rem; background: var(--bg-secondary);
  color: var(--text-primary); box-sizing: border-box;
  &:focus { outline: none; border-color: var(--amber); }
`;
const Textarea = styled.textarea`
  width: 100%; min-height: 110px; padding: 0.7rem 0.85rem; margin-bottom: 0.85rem; border-radius: 10px;
  border: 1.5px solid var(--border); font-size: 0.9rem; background: var(--bg-secondary);
  color: var(--text-primary); box-sizing: border-box; font-family: inherit; resize: vertical;
  &:focus { outline: none; border-color: var(--amber); }
`;
const Select = styled.select`
  width: 100%; padding: 0.7rem 0.85rem; margin-bottom: 0.85rem; border-radius: 10px;
  border: 1.5px solid var(--border); font-size: 0.9rem; background: var(--bg-secondary);
  color: var(--text-primary); box-sizing: border-box;
`;
const CheckRow = styled.label`display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.85rem; font-size: 0.9rem; color: var(--text-secondary); cursor: pointer;`;
const SubmitBtn = styled.button`
  width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #78350f, #d97706);
  color: white; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700;
  cursor: ${p => p.disabled ? 'default' : 'pointer'}; opacity: ${p => p.disabled ? 0.7 : 1};
`;
const ErrorText = styled.p`color: #b91c1c; font-size: 0.85rem; margin: -0.4rem 0 0.85rem;`;
const NoAccess = styled.div`padding: 3rem 1.5rem; text-align: center; color: var(--text-muted);`;

const CATEGORIES = ['Recorded Classes', 'Warm-Ups', 'Cool-Downs', 'Technique', 'Full Workouts'];

export default function VideoUpload({ userProfile }) {
  const navigate = useNavigate();
  const isAdmin = ['admin', 'superadmin'].includes(userProfile?.role);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) {
    return <NoAccess>You don't have permission to upload videos.</NoAccess>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !vimeoUrl.trim()) {
      setError('Title and Vimeo URL are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await addDoc(collection(db, 'videos'), {
        title: title.trim(),
        description: description.trim(),
        instructor: instructor.trim(),
        duration: duration.trim(),
        category,
        thumbnailUrl: thumbnailUrl.trim(),
        vimeoUrl: vimeoUrl.trim(),
        featured,
        pinned,
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        createdAt: serverTimestamp(),
      });
      navigate('/videos');
    } catch {
      setError('Failed to upload video. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card>
        <Title>Upload Video</Title>
        <form onSubmit={handleSubmit}>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="Instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)} />
          <Input placeholder="Duration (e.g. 52 min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <Input placeholder="Thumbnail URL" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          <Input placeholder="Vimeo embed URL" value={vimeoUrl} onChange={(e) => setVimeoUrl(e.target.value)} />
          <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />

          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>

          <CheckRow>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured Video
          </CheckRow>
          <CheckRow>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to Top
          </CheckRow>

          {error && <ErrorText>{error}</ErrorText>}

          <SubmitBtn disabled={loading}>{loading ? 'Publishing…' : 'Publish Video'}</SubmitBtn>
        </form>
      </Card>
    </Page>
  );
}
