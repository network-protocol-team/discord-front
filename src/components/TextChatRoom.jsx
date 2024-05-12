import { useRef } from 'react';
import Profile from './Profile';
import ProfileImage from '../assets/sample.png';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';

export default function TextChatRoom() {
  const textareaRef = useRef();

  const handleResizeHeight = () => {
    textareaRef.current.style.height = 'auto'; //height 초기화
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
  };

  return (
    <>
      <div className="text-room-wrapper">
        <div className="text-room">
          <header className="text-room-header">
            <ChatBubbleIcon />
            <h3 className="title">채널 1</h3>
          </header>
          <hr className="hr-light" />
          <div className="message-list">
            <Message />
            <Message />
            <Message />
            <Message />
            <Message />
            <Message />
          </div>
          <div className="message-input">
            <textarea
              placeholder="메세지 보내기"
              aria-label="Message"
              ref={textareaRef}
              rows={1}
              onChange={() => handleResizeHeight()}
            />
            <SendIcon onClick={() => console.log('asdf')} />
          </div>
        </div>
      </div>
    </>
  );
}

const Message = () => {
  return (
    <div className="message">
      <Profile src={ProfileImage} />
      <div className="message-body">
        <header>
          <span className="name">익명의 카멜레온</span>
          <span className="time">2024.05.01. 오후 2:26</span>
        </header>
        <p>그냥 아무거나 말한 것</p>
      </div>
    </div>
  );
};
