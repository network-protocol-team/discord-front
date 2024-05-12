import LogoutIcon from '@mui/icons-material/Logout';
import TagIcon from '@mui/icons-material/Tag';
import ProfileImage from '../assets/sample.png';
import MapsUgcIcon from '@mui/icons-material/MapsUgc';
import DeleteIcon from '@mui/icons-material/Delete';

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

  return (
    <div className="chat-list">
      <header>
        <h3>채널</h3>
        <MapsUgcIcon />
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
