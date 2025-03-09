import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserCircleIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Post } from '../types/post';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  profilePicture: string | null;
}

const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  posts,
  setPosts,
  profilePicture,
}) => {
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = () => {
    if (newPost.trim() || selectedImage) {
      const post: Post = {
        id: Date.now().toString(),
        author: currentUser,
        content: newPost,
        timestamp: 'now',
        likes: 0,
        reposts: 0,
        repostedBy: [],
        likedBy: [],
        imageUrl: selectedImage || undefined,
        comments: [],
        profilePicture: profilePicture || undefined,
      };
      setPosts([post, ...posts]);
      setNewPost('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const modalContent = (
    <>
      {/* Backdrop - only for click handling */}
      <div 
        className="fixed inset-0" 
        style={{ zIndex: 2147483646 }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 2147483647 }}
      >
        <div className="bg-black w-full max-w-xl rounded-2xl border border-zinc-800 pointer-events-auto">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="flex space-x-4">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <UserCircleIcon className="h-12 w-12 text-gray-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <textarea
                  className="w-full bg-transparent text-xl placeholder-gray-500 border-none focus:ring-0 focus:outline-none resize-none"
                  placeholder="Got any hot takes?"
                  rows={4}
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  maxLength={280}
                  autoFocus
                />
                {selectedImage && (
                  <div className="relative mt-2">
                    <div className="flex justify-start">
                      <img
                        src={selectedImage}
                        alt="Selected"
                        className="rounded-2xl max-h-80 object-contain"
                      />
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white p-2 rounded-full hover:bg-opacity-100"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                ref={fileInputRef}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-400 hover:text-emerald-500 transition-colors"
              >
                <PhotoIcon className="h-6 w-6" />
              </button>
              <span className="text-sm text-gray-500">
                {newPost.length}/280
              </span>
            </div>
            <button
              className="bg-emerald-500 text-white rounded-full px-6 py-2 font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePost}
              disabled={!newPost.trim() && !selectedImage}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default PostModal; 