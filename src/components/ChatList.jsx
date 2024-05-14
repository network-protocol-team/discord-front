import LogoutIcon from '@mui/icons-material/Logout';
import TagIcon from '@mui/icons-material/Tag';
import ProfileImage from '../assets/sample.png';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRef, useState } from 'react';
import axios from 'axios';
import { Modal } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../data/store';

export default function ChatList() {
  const navigation = useNavigate();
  const channels = useChatStore((state) => state.channels);
  const setChannels = useChatStore((state) => state.setChannels);

  const resetStore = useChatStore((state) => state.reset);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef();
  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const createRoom = (e) => {
    const channel_name = inputRef.current.value;
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    const data = { channel_name };

    axios
      .post(`${serverUrl}/channels`, data)
      .then((res) => res.data)
      .then(({ code, message, result }) => {
        if (code !== 200) {
          throw new Error(message);
        }

        const { id, channel_name } = result;

        // 성공하면 채팅방에 추가
        setChannels([...channels, { id, channel_name }]);

        // 모달 닫기
        closeModal();

        // 새롭게 생성한 채팅방으로 이동
        navigation(`/channels/${id}`);
      })
      .catch((err) => console.error(err));

    e.preventDefault();
  };

  const logout = () => {
    // TODO: 쿠키 및 클라이언트 상태 삭제
    navigation('/users');
    resetStore();
  };

  const handleInputChange = (e) => {
    inputRef.current.value = e.target.value;
  };

  return (
    <>
      <Modal open={isModalOpen} onClose={closeModal}>
        <div className="modal-box">
          <header>
            <h1>새로운 채널 만들기</h1>
            <p>새롭게 만들 채널의 이름을 입력해주세요.</p>
          </header>
          <form onSubmit={createRoom}>
            <p className="desc">채널 이름</p>
            <input
              autoFocus
              className="full"
              ref={inputRef}
              onChange={handleInputChange}
              defaultValue=""
            />
            <button className="submit">채널 생성</button>
          </form>
        </div>
      </Modal>
      <div className="chat-list">
        <header>
          <h3>채널</h3>
          <MapsUgcIcon className="new-chat-button" onClick={openModal} />
        </header>
        <hr className="hr-light" />
        <ul>
          {channels.map(({ channel_name: channelName, id: channelId }) => (
            <ChatListItem
              channelName={channelName}
              channelId={channelId}
              key={channelId}
            />
          ))}
        </ul>
        <footer>
          <img src={ProfileImage} alt="프로필 사진" />
          <p>익명의 카멜레온</p>
          <LogoutIcon onClick={logout} />
        </footer>
      </div>
    </>
  );
}

const ChatListItem = ({ channelName, channelId }) => {
  const navigate = useNavigate();
  const selectedId = useChatStore((state) => state.selectedId);
  const selectItem = (id) => {
    navigate(`/channels/${id}`);
  };

  return (
    <li
      onClick={() => selectItem(channelId)}
      className={selectedId === channelId ? 'active' : ''}
    >
      <TagIcon />
      <p>{channelName}</p>
      <DeleteIcon className="delete" />
    </li>
  );
};
