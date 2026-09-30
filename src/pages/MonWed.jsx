import ChatRoom from '../components/ChatRoom';

export default function MonWed({ userProfile }) {
  const hasAccess = userProfile?.class === 'monwed' || userProfile?.class === 'both';
  return (
    <ChatRoom
      room="mon-wed"
      icon="🌿"
      title="Mon / Wed"
      userProfile={userProfile}
      hasAccess={hasAccess}
      noAccessTitle="Mon / Wed Chat"
      noAccessBody="You're not enrolled in the Mon/Wed class. Contact your instructor if you think this is a mistake."
    />
  );
}
