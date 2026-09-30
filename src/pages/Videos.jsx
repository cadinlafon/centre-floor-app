import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Page = styled.div`padding: 1.25rem; max-width: 640px; margin: 0 auto;`;
const HeaderRow = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem;`;
const Title = styled.h1`font-family: Georgia, serif; font-size: 1.4rem; color: var(--brown-dark); margin: 0;`;
const AddBtn = styled.button`
  background: linear-gradient(135deg, #78350f, #d97706); color: white; border: none;
  border-radius: 9px; padding: 0.5rem 0.85rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
`;
const SearchInput = styled.input`
  width: 100%; padding: 0.7rem 0.9rem; margin-bottom: 1.25rem; border-radius: 12px;
  border: 1.5px solid var(--border); font-size: 0.9rem; background: var(--bg-card);
  color: var(--text-primary); box-sizing: border-box;
  &:focus { outline: none; border-color: var(--amber); }
`;
const EmptyCard = styled.div`
  background: var(--bg-card); border: 1.5px dashed var(--border);
  border-radius: 16px; padding: 3rem 1.5rem; text-align: center;
`;
const EmptyIcon = styled.div`font-size: 2.5rem; margin-bottom: 0.75rem;`;
const EmptyTitle = styled.h3`font-family: Georgia, serif; color: var(--brown-dark); margin: 0 0 0.35rem;`;
const EmptyBody = styled.p`font-size: 0.875rem; color: var(--text-muted); margin: 0;`;
const Card = styled.div`
  background: var(--bg-card); border-radius: 16px; overflow: hidden; margin-bottom: 1.25rem;
  box-shadow: 0 2px 10px var(--shadow); border: 1.5px solid var(--border);
`;
const Thumb = styled.img`width: 100%; height: 200px; object-fit: cover; display: block; background: var(--bg-secondary);`;
const CardBody = styled.div`padding: 1rem 1.1rem;`;
const CardTitle = styled.h3`font-family: Georgia, serif; font-size: 1.05rem; color: var(--brown-dark); margin: 0 0 0.35rem;`;
const CardDesc = styled.p`font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 0.6rem; line-height: 1.45;`;
const MetaRow = styled.div`display: flex; gap: 1rem; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.5rem;`;
const VideoFrame = styled.iframe`width: 100%; height: 320px; border: none; border-radius: 10px; margin-top: 0.5rem;`;

export default function Videos({ userProfile }) {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isAdmin = ['admin', 'superadmin'].includes(userProfile?.role);

  function sortVideos(items) {
    return [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setVideos(sortVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredVideos = videos.filter((video) =>
    video.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page>
      <HeaderRow>
        <Title>Recorded Classes</Title>
        {isAdmin && <AddBtn onClick={() => navigate('/admin/videos/upload')}>+ Add Video</AddBtn>}
      </HeaderRow>

      <SearchInput
        type="text"
        placeholder="Search videos…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <EmptyCard><EmptyBody>Loading…</EmptyBody></EmptyCard>
      ) : error ? (
        <EmptyCard>
          <EmptyIcon>⚠️</EmptyIcon>
          <EmptyTitle>Couldn't load videos</EmptyTitle>
          <EmptyBody>Please check your connection and try again.</EmptyBody>
        </EmptyCard>
      ) : filteredVideos.length === 0 ? (
        <EmptyCard>
          <EmptyIcon>🎬</EmptyIcon>
          <EmptyTitle>{search ? 'No videos match your search' : 'No recorded classes yet'}</EmptyTitle>
          <EmptyBody>{search ? 'Try a different search term.' : 'Check back soon for recorded sessions.'}</EmptyBody>
        </EmptyCard>
      ) : (
        filteredVideos.map((video) => (
          <Card key={video.id}>
            {video.thumbnailUrl && <Thumb src={video.thumbnailUrl} alt={video.title} />}
            <CardBody>
              <CardTitle>{video.pinned ? '📌 ' : ''}{video.title}</CardTitle>
              {video.description && <CardDesc>{video.description}</CardDesc>}
              <MetaRow>
                {video.instructor && <span><strong>Instructor:</strong> {video.instructor}</span>}
                {video.duration && <span><strong>Duration:</strong> {video.duration}</span>}
              </MetaRow>
              {video.vimeoUrl && (
                <VideoFrame
                  src={video.vimeoUrl}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={video.title}
                />
              )}
            </CardBody>
          </Card>
        ))
      )}
    </Page>
  );
}
