import ChatRoom from '../components/ChatRoom';

export default function ClassChat({ userProfile }) {
  return (
    <ChatRoom
      room="class-chat"
      icon="💬"
      title="Class Chat"
      subtitleSuffix="All students"
      userProfile={userProfile}
    />
  );
}
