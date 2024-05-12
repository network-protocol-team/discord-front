import LogoutIcon from '@mui/icons-material/Logout';
import TagIcon from '@mui/icons-material/Tag';
import ProfileImage from '../assets/sample.png';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { Modal } from '@mui/material';

export default function ChatList() {
  const chatRooms = [
    { id: '', channelName: '채널 1' },
    { id: '', channelName: '채널 2' },
    { id: '', channelName: '채널 3' },
    { id: '', channelName: '채널 4' },
    { id: '', channelName: '채널 5' },
    { id: '', channelName: '채널 6' },
    { id: '', channelName: '채널 7' },
    { id: '', channelName: '채널 8' },
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="chat-list">
      <Modal open={isModalOpen} onClose={closeModal}>
        <ChatCreateModal />
      </Modal>
      <header>
        <h3>채널</h3>
        <MapsUgcIcon onClick={openModal} />
      </header>
      <hr className="hr-light" />
      <ul>
        {chatRooms.map(({ channelName }, idx) => (
          <li key={idx}>
            <TagIcon />
            <p>{channelName}</p>
            <DeleteIcon className="delete" />
          </li>
        ))}
      </ul>
      <footer>
        <img src={ProfileImage} alt="프로필 사진" />
        <p>익명의 카멜레온</p>
        <LogoutIcon />
      </footer>
    </div>
  );
}

const ChatCreateModal = () => {
  return (
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
  );
};
