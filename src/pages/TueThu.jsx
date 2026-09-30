import ChatRoom from '../components/ChatRoom';

export default function TueThu({ userProfile }) {
  const hasAccess = userProfile?.class === 'tuethu' || userProfile?.class === 'both';
  return (
    <ChatRoom
      room="tue-thu"
      icon="🌸"
      title="Tue / Thu"
      userProfile={userProfile}
      hasAccess={hasAccess}
      noAccessTitle="Tue / Thu Chat"
      noAccessBody="You're not enrolled in the Tue/Thu class. Contact your instructor if you think this is a mistake."
    />
  );
}
