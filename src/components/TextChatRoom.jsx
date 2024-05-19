import { useRef, useState, useEffect } from "react";
import Profile from "./Profile";
import ProfileImage from "../assets/sample.png";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import { useChatStore } from "../data/store";
import { axiosApi } from "../utils/axios";

export default function TextChatRoom() {
  const selectedChatRoom = useChatStore((state) => state.selectedChatRoom);
  const textareaRef = useRef();
  const [errorMessage, setErrorMessage] = useState("");
  const [chatArray, setChatArray] = useState([]); // chatArray 상태 추가
  const [refresh, setRefresh] = useState(false); // 리렌더링을 위한 상태

  const loadChats = (e) => {
    const channel_id = "abjifjijxkjl"; // 테스트용, 추후 변경 필요
    const data = { channel_id };

    // chatArray 비우기
    setChatArray([]);

    axiosApi
      .get(`/channels/${channel_id}`, data)
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

        setChatArray(newChats); // 새로운 메시지 추가

        console.log(chatArray); // 디버깅용, 추후 삭제
      })
      .catch((err) => {
        setErrorMessage(err.message);
      });

    if (e) e.preventDefault();
  };

  const handleResizeHeight = () => {
    textareaRef.current.style.height = "auto"; // height 초기화
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  };

  const handleRefresh = () => {
    setRefresh((prev) => !prev); // 상태를 토글하여 컴포넌트를 리렌더링
  };

  useEffect(() => {
    loadChats(); // 페이지 로드 시 loadChats 함수 실행
  }, []); // 빈 의존성 배열을 사용하여 한 번만 실행

  return (
    <>
      <div className="text-room-wrapper">
        <div className="text-room">
          <header className="text-room-header">
            <ChatBubbleIcon />
            <h3 className="title">{selectedChatRoom?.channel_name}</h3>
          </header>
          <hr className="hr-light" />
          <div className="message-list">
            <Message chatArray={chatArray} key={refresh} /> {/* chatArray를 프롭으로 전달 */}
          </div>
          <div className="message-input">
            <textarea
              placeholder="메세지 보내기"
              aria-label="Message"
              ref={textareaRef}
              rows={1}
              onChange={handleResizeHeight}
            />
            <SendIcon onClick={loadChats} />
            <button onClick={handleRefresh}>hello</button>
          </div>
        </div>
      </div>
    </>
  );
}

const Message = ({ chatArray }) => {
  return (
    <>
      {chatArray.map((chat, index) => (
        <div className="message" key={index}>
          <Profile src={ProfileImage} />
          <div className="message-body">
            <header>
              <span className="name">{chat[0]}</span>
              <span className="time">{chat[1]}</span>
            </header>
            <p>{chat[2]}</p>
          </div>
        </div>
      ))}
    </>
  );
};