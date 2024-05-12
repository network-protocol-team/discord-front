import TextChatRoom from './TextChatRoom';
import VideoChatRoom from './VideoChatRoom';

export default function ChatRoom({ channelId }) {
  // TODO: 상태관리 library 사용
  const channelName = '채널 1';

  return (
    <>
      {channelId === undefined ? (
        <DefaultChat />
      ) : (
        <div className="chat-room">
          <VideoChatRoom />
          <TextChatRoom />
        </div>
      )}
    </>
  );
}

const DefaultChat = () => {
  return (
    <div className="chat-default-wrapper">
      <h1>썰렁하네요~🥱</h1>
      <p>생성된 채팅방을 클릭하거나, 새로운 채팅방을 생성해보세요.</p>
    </div>
  );
};
