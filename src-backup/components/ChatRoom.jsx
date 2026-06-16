import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

import { db, auth } from '../config';

export default function ChatRoom({
  activeTab
}) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!activeTab) return;

    const q = query(
      collection(
        db,
        'threads',
        activeTab,
        'messages'
      ),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data()
          })
        );

        setMessages(data);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  return (
    <div style={{ flex: 1, padding: '15px' }}>
      {messages.map((msg) => {
        const isMe =
          msg.senderId === auth.currentUser?.uid;

        return (
          <div
            key={msg.id}
            style={{
              textAlign: isMe
                ? 'right'
                : 'left',
              marginBottom: '10px'
            }}
          >
            <strong>
              {msg.senderName}
            </strong>

            <div>
              {msg.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}