import LogoutIcon from '@mui/icons-material/Logout';
import TagIcon from '@mui/icons-material/Tag';
import ProfileImage from '../assets/sample.png';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { Modal } from '@mui/material';
import { chatRooms } from '../data/mockChat';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../data/store';

export default function ChatList() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Modal open={isModalOpen} onClose={closeModal}>
        <div className="modal-box">
          <header>
            <h1>새로운 채널 만들기</h1>
            <p>새롭게 만들 채널의 이름을 입력해주세요.</p>
          </header>
          <form>
            <p className="desc">채널 이름</p>
            <input autoFocus className="full" />
            <button className="submit">채널 생성</button>
          </form>
        </div>
      </Modal>
      <div className="chat-list">
        <header>
          <h3>채널</h3>
          <MapsUgcIcon onClick={openModal} />
        </header>
        <hr className="hr-light" />
        <ul>
          {chatRooms.map(({ channelName, channelId }) => (
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
          <LogoutIcon />
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
