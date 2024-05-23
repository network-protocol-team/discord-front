import { useRef, useState, useEffect } from 'react';
import Profile from './Profile';
import ProfileImage from '../assets/sample.png';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { useChatStore } from '../data/store';
import { axiosApi } from '../utils/axios';
import * as StompJs from '@stomp/stompjs';

export default function TextChatRoom() {
  const selectedChatRoom = useChatStore((state) => state.selectedChatRoom);
  const selectedId = useChatStore((state) => state.selectedId);
  const selectedNickname = useChatStore((state) => state.selectedNickname);
  const chatSocket = useRef(null);
  const textareaRef = useRef();
  const [chatArray, setChatArray] = useState([]);
  const [refresh, setRefresh] = useState(false);

  const [chat, setChat] = useState('');

  const publish = (chat) => {
    if (!chatSocket.current.connected) return;

    chatSocket.current.publish({
      destination: `/pub/channels/${selectedId}/text`,
      body: JSON.stringify({
        nickName: selectedNickname,
        content: chat,
      }),
    });

    setChat('');
  };

  const connect = () => {
    // const socket = new SockJS(import.meta.env.VITE_SOCK_URL);
    chatSocket.current = new StompJs.Client({
      // webSocketFactory: () => socket,
      brokerURL: `ws://192.168.35.233:8080/ws`,
      debug: (str) => console.log(str),
      onConnect: () => {
        console.log('Connected to chat webSocket');

        chatSocket.current.subscribe(
          `/sub/channels/${selectedId}/text`,
          chatUpdate,
        );
      },
    });
    chatSocket.current.activate();
  };

  const disconnect = () => {
    chatSocket.current.deactivate();
  };

  const chatUpdate = (message) => {
    const json_body = JSON.parse(message.body).result;
    setChatArray((_chat_list) => [..._chat_list, json_body]);
  };

  const handleChange = (event) => {
    setChat(event.target.value);
  };

  const handleSubmit = (event, chat) => {
    event.preventDefault();
    publish(chat);
  };

  const loadChats = (e) => {
    const data = { selectedId };
    setChatArray([]);

    axiosApi
      .get(`/channels/${selectedId}`, data)
      .then((res) => res.data)
      .then(({ code, message, result }) => {
        if (code !== 200) {
          throw new Error(message);
        }

        const newChats = result.messages.map((msg) => [
          msg.username,
          msg.created_at,
          msg.content,
        ]);

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
    loadChats();
    connect();
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
          <div className="message-list">
            <Message chatArray={chatArray} key={refresh} />
          </div>
          <div className="message-input">
            <textarea
              placeholder="메세지 보내기"
              aria-label="Message"
              ref={textareaRef}
              rows={1}
              onChange={handleChangeAndResize}
              value={chat}
            />
            <SendIcon onClick={(event) => handleSubmit(event, chat)} />
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
