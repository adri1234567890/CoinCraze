import React, { useState, useRef } from 'react';
import { UserCircleIcon, PhotoIcon, CheckBadgeIcon, ChatBubbleLeftIcon, TrashIcon } from '@heroicons/react/24/solid';
import { Post, Comment } from '../types/post';
import DeleteConfirmModal from './DeleteConfirmModal';

interface FeedProps {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  currentUser: string;
  isVerified?: boolean;
  profilePicture: string | null;
  balance: number;
  ownedSolana?: number;
  solanaPrice?: number;
}

const Feed: React.FC<FeedProps> = ({ 
  posts, 
  setPosts, 
  currentUser, 
  isVerified = false, 
  profilePicture,
  balance = 0,
  ownedSolana = 0,
  solanaPrice = 0
}) => {
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [showPortfolioValue, setShowPortfolioValue] = useState(false);

  // Calculate total balance
  const totalBalance = balance + (ownedSolana * solanaPrice);

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
        ...(showPortfolioValue && {
          portfolioValue: {
            totalValue: totalBalance,
            showValue: true
          }
        })
      };
      setPosts([post, ...posts]);
      setNewPost('');
      setSelectedImage(null);
      setShowPortfolioValue(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleComment = (postId: string) => {
    const comment = commentText[postId]?.trim();
    if (!comment) return;

    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newComment: Comment = {
          id: Date.now().toString(),
          author: currentUser,
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
              const hasLiked = comment.likedBy.includes(currentUser);
              if (hasLiked) {
                return {
                  ...comment,
                  likes: comment.likes - 1,
                  likedBy: comment.likedBy.filter(user => user !== currentUser)
                };
              } else {
                return {
                  ...comment,
                  likes: comment.likes + 1,
                  likedBy: [...comment.likedBy, currentUser]
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

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        // Check if user has already liked this post
        const hasLiked = post.likedBy.includes(currentUser);
        if (hasLiked) {
          // Unlike the post
          return {
            ...post,
            likes: post.likes - 1,
            likedBy: post.likedBy.filter(user => user !== currentUser)
          };
        } else {
          // Like the post
          return {
            ...post,
            likes: post.likes + 1,
            likedBy: [...post.likedBy, currentUser]
          };
        }
      }
      return post;
    }));
  };

  const handleRepost = (postId: string) => {
    // Find the original post (not a repost)
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;

    // Get the original post ID (if this is a repost, use its originalPostId)
    const originalPostId = targetPost.isRepost ? targetPost.originalPostId : targetPost.id;
    const originalPost = posts.find(p => p.id === originalPostId);
    if (!originalPost) return;

    const isAlreadyReposted = originalPost.repostedBy.includes(currentUser);
    
    if (isAlreadyReposted) {
      // Remove repost
      setPosts(prevPosts => {
        // First, filter out the user's repost
        const filteredPosts = prevPosts.filter(p => 
          !(p.isRepost && p.originalPostId === originalPostId && p.author === currentUser)
        );
        
        // Then update all instances of the original post
        return filteredPosts.map(post => {
          if (post.id === originalPostId || (post.isRepost && post.originalPostId === originalPostId)) {
            const updatedRepostedBy = post.repostedBy.filter(user => user !== currentUser);
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
      const updatedRepostedBy = [...originalPost.repostedBy, currentUser];

      const repost: Post = {
        ...originalPost,
        id: Date.now().toString(),
        author: currentUser,
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
          <h1 className="text-xl font-bold">Home</h1>
        </div>
      </div>

      {/* Post composer */}
      <div className="p-6 border-b border-zinc-800">
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
              className="w-full bg-transparent text-xl placeholder-gray-500 border-none focus:outline-none focus:ring-0 resize-none"
              placeholder="Got any hot takes?"
              rows={3}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              maxLength={280}
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
                  ✕
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4">
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
                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-sm text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPortfolioValue}
                      onChange={(e) => setShowPortfolioValue(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-emerald-500 rounded border-gray-600 bg-transparent focus:ring-0"
                    />
                    <span>Show portfolio value</span>
                  </label>
                </div>
                <span className="text-sm text-gray-500">
                  {newPost.length}/280
                </span>
              </div>
              <button 
                className="bg-emerald-500 text-white rounded-full px-6 py-3 font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handlePost}
                disabled={!newPost.trim() && !selectedImage}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="divide-y divide-zinc-800">
        {posts.map((post) => (
          <div key={post.id} className="p-6 hover:bg-zinc-900 transition-colors">
            {post.isRepost && (
              <div className="text-sm text-gray-500 mb-2">
                🔄 Reposted by {post.author}
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
                  {(post.author === currentUser && isVerified) && (
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                  )}
                  {post.portfolioValue?.showValue && (
                    <div className="ml-2 flex items-center">
                      <span className="text-emerald-400">
                        Portfolio Value: ${post.portfolioValue.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {post.author === currentUser && !post.isRepost && (
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
                      post.likedBy.includes(currentUser) ? 'text-emerald-400' : ''
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
                      post.repostedBy.includes(currentUser) 
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

                    {/* Comments List */}
                    <div className="space-y-3 pl-6 border-l border-zinc-800">
                      {post.comments.map(comment => (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm">{comment.author}</span>
                            <span className="text-gray-500 text-xs">· {comment.timestamp}</span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <button
                            onClick={() => handleLikeComment(post.id, comment.id)}
                            className={`text-xs hover:text-emerald-400 transition-colors ${
                              comment.likedBy.includes(currentUser) ? 'text-emerald-400' : 'text-gray-500'
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

export default Feed; 