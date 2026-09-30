import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/** Upload a profile photo and return its public URL. */
export async function uploadProfilePhoto(uid, file) {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileRef = ref(storage, `profile-photos/${uid}/avatar.${ext}`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}
