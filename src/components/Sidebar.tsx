import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserIcon,
  CurrencyDollarIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserIcon as UserIconSolid,
  CurrencyDollarIcon as CurrencyDollarIconSolid,
  WalletIcon as WalletIconSolid,
} from '@heroicons/react/24/solid';
import PostModal from './PostModal';
import { Post } from '../types/post';

interface SidebarProps {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  currentUser: string;
  profilePicture: string | null;
}

const menuItems = [
  {
    path: '/',
    text: 'Home',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    path: '/profile',
    text: 'Profile',
    icon: UserIcon,
    activeIcon: UserIconSolid,
  },
  {
    path: '/crypto',
    text: 'Crypto',
    icon: CurrencyDollarIcon,
    activeIcon: CurrencyDollarIconSolid,
  },
  {
    path: '/wallet',
    text: 'Wallet',
    icon: WalletIcon,
    activeIcon: WalletIconSolid,
  },
];

const Sidebar: React.FC<SidebarProps> = ({ posts, setPosts, currentUser, profilePicture }) => {
  const location = useLocation();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1">
        <div className="text-2xl font-bold mb-4 px-4">
          <span className="text-emerald-400 hover:text-emerald-300 transition-colors">CoinCraze</span>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = isActive ? item.activeIcon : item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-4 px-4 py-3 text-xl rounded-full transition-colors ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-900/20'
                    : 'text-white hover:bg-emerald-900/20'
                }`}
              >
                <Icon className="h-7 w-7" />
                <span>{item.text}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <button 
        onClick={() => setIsPostModalOpen(true)}
        className="w-full bg-emerald-500 text-white rounded-full py-3 text-lg font-bold hover:bg-emerald-600 transition-colors"
      >
        Post
      </button>

      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        currentUser={currentUser}
        posts={posts}
        setPosts={setPosts}
        profilePicture={profilePicture}
      />
    </div>
  );
};

export default Sidebar; 