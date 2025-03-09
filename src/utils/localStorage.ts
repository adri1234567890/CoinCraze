import { Post } from '../types/post';

const STORAGE_KEYS = {
  POSTS: 'coincraze_posts',
  USERNAME: 'coincraze_username',
  IS_VERIFIED: 'coincraze_is_verified',
  PROFILE_PICTURE: 'coincraze_profile_picture',
  BALANCE: 'coincraze_balance'
};

export const saveToLocalStorage = {
  posts: (posts: Post[]) => {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  },
  username: (username: string) => {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
  },
  isVerified: (isVerified: boolean) => {
    localStorage.setItem(STORAGE_KEYS.IS_VERIFIED, JSON.stringify(isVerified));
  },
  profilePicture: (profilePicture: string | null) => {
    if (profilePicture) {
      localStorage.setItem(STORAGE_KEYS.PROFILE_PICTURE, profilePicture);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PROFILE_PICTURE);
    }
  },
  balance: (balance: number) => {
    localStorage.setItem(STORAGE_KEYS.BALANCE, JSON.stringify(balance));
  }
};

export const loadFromLocalStorage = {
  posts: (): Post[] => {
    const posts = localStorage.getItem(STORAGE_KEYS.POSTS);
    return posts ? JSON.parse(posts) : [];
  },
  username: (): string => {
    return localStorage.getItem(STORAGE_KEYS.USERNAME) || 'User';
  },
  isVerified: (): boolean => {
    const isVerified = localStorage.getItem(STORAGE_KEYS.IS_VERIFIED);
    return isVerified ? JSON.parse(isVerified) : false;
  },
  profilePicture: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.PROFILE_PICTURE) || null;
  },
  balance: (): number => {
    const balance = localStorage.getItem(STORAGE_KEYS.BALANCE);
    return balance ? JSON.parse(balance) : 1000; // Default starting balance
  }
}; 