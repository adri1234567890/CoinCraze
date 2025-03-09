import React, { useState, useRef } from 'react';
import { UserCircleIcon, CheckBadgeIcon, ChatBubbleLeftIcon, PencilIcon, CameraIcon, TrashIcon } from '@heroicons/react/24/solid';
import { Post, Comment } from '../types/post';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ProfileProps {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  isVerified?: boolean;
  setIsVerified?: (verified: boolean) => void;
  profilePicture: string | null;
  setProfilePicture: React.Dispatch<React.SetStateAction<string | null>>;
  balance: number;
  setBalance: (balance: number) => void;
  ownedSolana?: number;
  solanaPrice?: number;
}

const Profile: React.FC<ProfileProps> = ({ 
  username, 
  setUsername,
  posts, 
  setPosts, 
  isVerified = false, 
  setIsVerified,
  profilePicture,
  setProfilePicture,
  balance,
  setBalance,
  ownedSolana = 0,
  solanaPrice = 0
}) => {
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState(username);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [showPortfolioValue, setShowPortfolioValue] = useState(false);

  const VERIFICATION_COST = 200;

  // Calculate total balance
  const totalBalance = balance + (ownedSolana * solanaPrice);

  // Filter posts to only show:
  // 1. Posts authored by the user
  // 2. Posts that the user has reposted (marked with isRepost=true)
  const userPosts = posts.filter(post => 
    post.author === username || 
    (post.isRepost && post.author === username)
  );

  const handleProfilePictureSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
        // Update profile picture in all posts by this user
        setPosts(posts.map(post => {
          if (post.author === username) {
            return { ...post, profilePicture: reader.result as string };
          }
          return post;
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = () => {
    if (newUsername.trim() && newUsername !== username) {
      setUsername(newUsername);
      // Update username in posts
      setPosts(posts.map(post => {
        if (post.author === username) {
          return { ...post, author: newUsername };
        }
        if (post.originalAuthor === username) {
          return { ...post, originalAuthor: newUsername };
        }
        return post;
      }));
    }
    setIsEditingName(false);
  };

  const handleRepost = (postId: string) => {
    // Find the original post (not a repost)
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    // Get the original post ID (if this is a repost, use its originalPostId)
    const originalPostId = targetPost.isRepost ? targetPost.originalPostId : targetPost.id;
    const originalPost = posts.find(p => p.id === originalPostId);
    if (!originalPost) return;

    const isAlreadyReposted = originalPost.repostedBy.includes(username);
    
    if (isAlreadyReposted) {
      // Remove repost
      setPosts(prevPosts => {
        // First, filter out the user's repost
        const filteredPosts = prevPosts.filter(p => 
          !(p.isRepost && p.originalPostId === originalPostId && p.author === username)
        );
        
        // Then update all instances of the original post
        return filteredPosts.map(post => {
          if (post.id === originalPostId || (post.isRepost && post.originalPostId === originalPostId)) {
            const updatedRepostedBy = post.repostedBy.filter(user => user !== username);
            return {
              ...post,
              reposts: originalPost.reposts - 1,
              repostedBy: updatedRepostedBy
            };
          }
          return post;
        });
      });
    } else {
      // Create new repost
      const newRepostCount = originalPost.reposts + 1;
      const updatedRepostedBy = [...originalPost.repostedBy, username];

      const repost: Post = {
        ...originalPost,
        id: Date.now().toString(),
        author: username,
        timestamp: 'now',
        isRepost: true,
        originalPostId: originalPostId,
        originalAuthor: originalPost.author,
        reposts: newRepostCount,
        repostedBy: updatedRepostedBy,
      };

      // Add repost and update counts
      setPosts(prevPosts => [
        repost,
        ...prevPosts.map(post => {
          if (post.id === originalPostId || (post.isRepost && post.originalPostId === originalPostId)) {
            return {
              ...post,
              reposts: newRepostCount,
              repostedBy: updatedRepostedBy
            };
          }
          return post;
        })
      ]);
    }
  };

  const handleVerification = () => {
    setShowVerificationModal(true);
  };

  const handleVerificationConfirm = () => {
    if (balance >= VERIFICATION_COST && setIsVerified) {
      setBalance(balance - VERIFICATION_COST);
      setIsVerified(true);
      setShowVerificationModal(false);
    }
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        // Check if user has already liked this post
        const hasLiked = post.likedBy.includes(username);
        if (hasLiked) {
          // Unlike the post
          return {
            ...post,
            likes: post.likes - 1,
            likedBy: post.likedBy.filter(user => user !== username)
          };
        } else {
          // Like the post
          return {
            ...post,
            likes: post.likes + 1,
            likedBy: [...post.likedBy, username]
          };
        }
      }
      return post;
    }));
  };

  const handleComment = (postId: string) => {
    const comment = commentText[postId]?.trim();
    if (!comment) return;

    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newComment: Comment = {
          id: Date.now().toString(),
          author: username,
          content: comment,
          timestamp: 'now',
          likes: 0,
          likedBy: [],
          ...(showPortfolioValue && {
            portfolioValue: {
              totalValue: totalBalance,
              showValue: true
            }
          })
        };
        return {
          ...post,
          comments: [newComment, ...post.comments]
        };
      }
      return post;
    }));

    setCommentText(prev => ({ ...prev, [postId]: '' }));
    setShowPortfolioValue(false);
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments.map(comment => {
            if (comment.id === commentId) {
              const hasLiked = comment.likedBy.includes(username);
              if (hasLiked) {
                return {
                  ...comment,
                  likes: comment.likes - 1,
                  likedBy: comment.likedBy.filter(user => user !== username)
                };
              } else {
                return {
                  ...comment,
                  likes: comment.likes + 1,
                  likedBy: [...comment.likedBy, username]
                };
              }
            }
            return comment;
          })
        };
      }
      return post;
    }));
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleDeletePost = (postId: string) => {
    setPostToDelete(postId);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      setPosts(prevPosts => prevPosts.filter(p => 
        p.id !== postToDelete && p.originalPostId !== postToDelete
      ));
      setPostToDelete(null);
    }
  };

  return (
    <div className="w-full bg-black text-white">
      <div className="sticky top-0 z-[1] bg-black bg-opacity-90 backdrop-blur">
        <div className="px-6 py-3 border-b border-zinc-800">
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#111111] rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-800">
            <h3 className="text-xl font-bold mb-4">Get Verified</h3>
            <p className="text-gray-400 mb-6">
              Getting verified costs ${VERIFICATION_COST}. This amount will be deducted from your balance.
              {balance < VERIFICATION_COST && (
                <span className="block mt-2 text-red-500">
                  You don't have enough funds. Required: ${VERIFICATION_COST}, Available: ${balance}
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerificationConfirm}
                disabled={balance < VERIFICATION_COST}
                className={`px-4 py-2 rounded-lg ${
                  balance >= VERIFICATION_COST
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-600 cursor-not-allowed'
                } transition-colors`}
              >
                Pay ${VERIFICATION_COST}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center space-x-6">
          <div className="relative group">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="h-24 w-24 text-gray-500 flex-shrink-0" />
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <CameraIcon className="h-8 w-8 text-white" />
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureSelect}
              className="hidden"
              ref={fileInputRef}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-zinc-900 text-2xl font-bold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleNameChange();
                      }
                    }}
                    onBlur={handleNameChange}
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold">{username}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-gray-500 hover:text-emerald-400 transition-colors"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
              {isVerified && <CheckBadgeIcon className="h-6 w-6 text-emerald-400" />}
            </div>
            <p className="text-gray-500 mt-1">{userPosts.length} Posts & Reposts</p>
            {!isVerified && (
              <button
                onClick={handleVerification}
                className="mt-4 bg-emerald-500 text-white rounded-full px-6 py-3 font-bold hover:bg-emerald-600 transition-colors"
              >
                Become Verified
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User's Posts and Reposts */}
      <div className="divide-y divide-zinc-800">
        {userPosts.map((post) => (
          <div key={post.id} className="p-6 hover:bg-zinc-900 transition-colors">
            {post.isRepost && (
              <div className="text-sm text-gray-500 mb-2">
                🔄 You Reposted
              </div>
            )}
            <div className="flex space-x-4">
              {post.profilePicture ? (
                <img
                  src={post.profilePicture}
                  alt="Profile"
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <UserCircleIcon className="h-12 w-12 text-gray-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold">
                    {post.isRepost ? post.originalAuthor || post.author : post.author}
                  </span>
                  <span className="text-gray-500">· {post.timestamp}</span>
                  {post.portfolioValue?.showValue && (
                    <div className="ml-2 flex items-center">
                      <span className="text-emerald-400">
                        Portfolio Value: ${post.portfolioValue.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {post.author === username && !post.isRepost && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors ml-auto"
                      title="Delete post"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-lg break-words">{post.content}</p>
                {post.imageUrl && (
                  <div className="mt-3">
                    <div className="flex justify-start">
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="rounded-2xl max-h-96 object-contain"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-4 flex space-x-6 text-gray-500">
                  <button 
                    className={`hover:text-emerald-400 transition-colors flex items-center space-x-2 ${
                      post.likedBy.includes(username) ? 'text-emerald-400' : ''
                    }`}
                    onClick={() => handleLike(post.id)}
                  >
                    <span>{post.likes} Likes</span>
                  </button>
                  <button 
                    className={`transition-colors flex items-center space-x-2 hover:text-emerald-400`}
                    onClick={() => toggleComments(post.id)}
                  >
                    <ChatBubbleLeftIcon className="h-5 w-5" />
                    <span>{post.comments.length} Comments</span>
                  </button>
                  <button 
                    className={`transition-colors flex items-center space-x-2 ${
                      post.repostedBy.includes(username) 
                        ? 'text-emerald-400' 
                        : 'text-gray-500 hover:text-emerald-400'
                    }`}
                    onClick={() => handleRepost(post.id)}
                  >
                    <span>{post.reposts} Reposts</span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText(prev => ({
                            ...prev,
                            [post.id]: e.target.value
                          }))}
                          placeholder="Write a comment..."
                          className="flex-1 bg-black rounded-full px-4 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={!commentText[post.id]?.trim()}
                          className="bg-emerald-500 text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Comment
                        </button>
                      </div>
                      <div className="flex items-center px-4">
                        <button
                          onClick={() => setShowPortfolioValue(!showPortfolioValue)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            showPortfolioValue
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              : 'bg-zinc-800/50 text-gray-400 hover:bg-zinc-800'
                          }`}
                        >
                          <svg
                            className={`h-4 w-4 transition-colors ${showPortfolioValue ? 'text-emerald-500' : 'text-gray-400'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Show Portfolio Value</span>
                          <div className={`ml-2 h-3 w-3 rounded-full transition-colors ${
                            showPortfolioValue ? 'bg-emerald-500' : 'bg-gray-600'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 pl-6 border-l border-zinc-800">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm">{comment.author}</span>
                            <span className="text-gray-500 text-xs">· {comment.timestamp}</span>
                            {comment.author === username && isVerified && (
                              <CheckBadgeIcon className="h-4 w-4 text-emerald-400" />
                            )}
                            {comment.portfolioValue?.showValue && (
                              <div className="flex items-center">
                                <span className="text-emerald-400 text-xs">
                                  Portfolio Value: ${comment.portfolioValue.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <button
                            onClick={() => handleLikeComment(post.id, comment.id)}
                            className={`text-xs hover:text-emerald-400 transition-colors ${
                              comment.likedBy.includes(username) ? 'text-emerald-400' : 'text-gray-500'
                            }`}
                          >
                            {comment.likes} Likes
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmModal
        isOpen={postToDelete !== null}
        onClose={() => setPostToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Profile; 