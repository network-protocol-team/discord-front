import { useRef, useState, useEffect } from 'react';
import Profile from './Profile';
import ProfileImage from '../assets/sample.png';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { useChatStore } from '../data/store';
import { axiosApi } from '../utils/axios';
import * as StompJs from '@stomp/stompjs';
import { parseMessage } from '../utils/socket';

export default function TextChatRoom() {
  const selectedChatRoom = useChatStore((state) => state.selectedChatRoom);
  const selectedId = useChatStore((state) => state.selectedId);
  const selectedNickname = useChatStore((state) => state.nickName);
  const chatSocket = useRef(null);
  const textareaRef = useRef();
  const messageWrapperRef = useRef();
  const [chatArray, setChatArray] = useState([]);
  const [refresh, setRefresh] = useState(false);

  const [chat, setChat] = useState('');

  const publish = (chat) => {
    if (!chatSocket.current || !chatSocket.current.connected) {
      console.log('Socket is not connected');
      return;
    }

    try {
      console.log('Publishing chat:', chat);

      chatSocket.current.publish({
        destination: `/pub/channels/${selectedId}/text`,
        body: JSON.stringify({
          nickName: selectedNickname,
          content: chat,
        }),
      });

      setChat('');
    } catch (error) {
      console.error('Failed to publish chat:', error);
    }
  };

  const connect = () => {
    if (chatSocket.current && chatSocket.current.connected) {
      console.log('Socket is already connected');
      return;
    }

    chatSocket.current = new StompJs.Client({
      brokerURL: import.meta.env.VITE_SOCK_URL,
      debug: () => {},
      reconnectDelay: 5000, // 자동 재 연결
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('Connected to chat webSocket');

        chatSocket.current.subscribe(
          `/sub/channels/${selectedId}/text`,
          chatUpdate,
        );
      },
      onStompError: (frame) => {
        console.error(frame);
      },
    });

    chatSocket.current.activate();
  };

  const disconnect = () => {
    if (chatSocket.current && chatSocket.current.connected) {
      chatSocket.current.deactivate();
    }
  };

  const chatUpdate = (message) => {
    const json_body = parseMessage(message);
    const { nickName, content, createdAt } = json_body.result;
    setChatArray((_chat_list) => [
      ..._chat_list,
      { nickName, content, createdAt },
    ]);
    console.log(nickName, content, createdAt);
  };

  const handleChange = (event) => {
    setChat(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    publish(chat);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const loadChats = (e) => {
    setChatArray([]);

    axiosApi
      .get(`/channels/${selectedId}`)
      .then((res) => res.data)
      .then(({ code, message, result }) => {
        if (code !== 200) {
          throw new Error(message);
        }

        const newChats = [...result.messageList];

        setChatArray(newChats);
      });

    if (e) e.preventDefault();
  };

  const handleResizeHeight = () => {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
  };

  const handleRefresh = () => {
    setRefresh((prev) => !prev);
  };

  const handleChangeAndResize = (event) => {
    handleChange(event);
    handleResizeHeight();
  };

  useEffect(() => {
    if (chatSocket.current) {
      disconnect();
    }

    connect();
    loadChats();

    setTimeout(() => {
      messageWrapperRef.current.scrollTop =
        messageWrapperRef.current?.scrollHeight -
        messageWrapperRef.current?.clientHeight;
    }, 1000);
    return () => disconnect();
  }, [selectedId]);

  return (
    <>
      <div className="text-room-wrapper">
        <div className="text-room">
          <header className="text-room-header">
            <ChatBubbleIcon />
            <h3 className="title">{selectedChatRoom?.channelName}</h3>
          </header>
          <hr className="hr-light" />
          <div className="message-list" ref={messageWrapperRef}>
            <Message chatArray={chatArray} key={refresh} />
          </div>
          <div className="message-input">
            <textarea
              placeholder="메세지 보내기"
              aria-label="Message"
              ref={textareaRef}
              rows={1}
              onChange={handleChangeAndResize}
              onKeyPress={handleKeyPress}
              value={chat}
            />
            <SendIcon onClick={handleSubmit} />
          </div>
        </div>
      </div>
    </>
  );
}

const Message = ({ chatArray }) => {
  return (
    <>
      {chatArray.map(({ nickName, createdAt, content }, index) => (
        <div className="message" key={index}>
          <Profile src={ProfileImage} />
          <div className="message-body">
            <header>
              <span className="name">{nickName}</span>
              <span className="time">{createdAt}</span>
            </header>
            <p>{content}</p>
          </div>
        </div>
      ))}
    </>
  );
};
