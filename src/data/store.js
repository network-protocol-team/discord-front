import { create } from 'zustand';

// TODO: react-query 잘 사용해서 서버 측 변수 상태관리하기

const chatStoreInit = {
  chats: [],
  selectedId: '0',
  selectedChatRoom: undefined,
};

export const useChatStore = create((set) => ({
  ...chatStoreInit,

  setChats: (chats) => set(() => ({ chats })),
  setSelectedId: (id) => set(() => ({ selectedId: id })),
  setSelectedChatRoom: (chatRoom) =>
    set(() => ({ selectedChatRoom: chatRoom })),
  reset: () => set(chatStoreInit),
}));
