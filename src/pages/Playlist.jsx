import { useState } from 'react';
import styled from 'styled-components';
import spotifyLogo from '../assets/spotify-logo.png';

const Page = styled.div`
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmbedWrapper = styled.div`
  position: relative;
  width: 100%;
  height: calc(100vh - var(--topbar-height) - var(--bottomnav-height) - 120px);
`;

const SpotifyEmbed = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 12px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--bg-primary);
  color: var(--blue-deeper, #3D6E75);

  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
`;

const SpotifyOption = styled.div`
  text-align: center;
  padding-bottom: 0.5rem;
`;

const Text = styled.p`
  margin: 0 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.9rem;
`;

const SpotifyButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  background: #1DB954;
  color: white;
  text-decoration: none;

  padding: 0.7rem 1.5rem;
  border-radius: 999px;

  font-weight: 700;
  font-size: 0.95rem;

  transition: transform 0.15s, opacity 0.15s;

  img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  &:hover {
    opacity: 0.9;
    transform: scale(1.03);
  }
`;

export default function Playlist() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Page>

      <EmbedWrapper>
        {isLoading && (
          <LoadingOverlay>
            Loading Playlist...
          </LoadingOverlay>
        )}

        <SpotifyEmbed
          src="https://open.spotify.com/embed/playlist/20l5S80YHLQb2iM8rMdhAI?utm_source=generator&theme=0&si=926a688e89304be4"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          allowFullScreen
          title="Spotify Playlist"
          onLoad={() => setIsLoading(false)}
        />
      </EmbedWrapper>

      <SpotifyOption>
        <Text>Or play in Spotify</Text>

        <SpotifyButton
          href="https://open.spotify.com/playlist/20l5S80YHLQb2iM8rMdhAI"
          target="_blank"
          rel="noreferrer"
        >
          <img src={spotifyLogo} alt="Spotify" />
          Open Spotify
        </SpotifyButton>
      </SpotifyOption>

    </Page>
  );
}