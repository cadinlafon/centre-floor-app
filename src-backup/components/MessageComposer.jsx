import { useState } from 'react';

export default function MessageComposer({
  onSend,
  uploading
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSend(text, file);

    setText('');
    setFile(null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={formStyle}
    >
      <input
        type="file"
        accept="image/*,video/*,application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <input
        type="text"
        value={text}
        placeholder="Type a message..."
        onChange={(e) => setText(e.target.value)}
        style={inputStyle}
      />

      <button type="submit" disabled={uploading}>
        {uploading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}

const formStyle = {
  display: 'flex',
  gap: '10px',
  padding: '12px',
  borderTop: '1px solid #E2E8F0'
};

const inputStyle = {
  flex: 1
};