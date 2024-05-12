import { useParams } from 'react-router-dom';

export default function ChatPage() {
  const { channelId } = useParams();
  return (
    <>
      <p>chat</p>
      <p>{`id: ${channelId}`}</p>
    </>
  );
}
