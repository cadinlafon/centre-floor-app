import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export async function uploadChatAttachment(room, uid, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `chat-attachments/${room}/${uid}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
  return {
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    path,
    url: await getDownloadURL(fileRef),
  };
}

export async function addReaction({ room, messageId, uid, userName, emoji }) {
  const id = `${messageId}_${uid}`;
  await setDoc(doc(db, 'messageReactions', id), {
    room,
    messageId,
    userId: uid,
    userName: userName || 'Student',
    emoji,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function removeReaction(messageId, uid) {
  await deleteDoc(doc(db, 'messageReactions', `${messageId}_${uid}`));
}

export async function saveMessage(uid, message) {
  const id = `${uid}_${message.id}`;
  await setDoc(doc(db, 'savedMessages', id), {
    uid,
    messageId: message.id,
    room: message.room,
    text: message.text || '',
    senderId: message.senderId,
    senderName: message.senderName || 'Student',
    createdAt: message.createdAt || serverTimestamp(),
    savedAt: serverTimestamp(),
  }, { merge: true });
}

export async function unsaveMessage(uid, messageId) {
  const snap = await getDocs(query(collection(db, 'savedMessages'), where('uid', '==', uid), where('messageId', '==', messageId)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}
