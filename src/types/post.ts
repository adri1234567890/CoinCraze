export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
  portfolioValue?: {
    totalValue: number;
    showValue: boolean;
  };
}

export interface Post {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  reposts: number;
  repostedBy: string[];
  likedBy: string[];  // Array of usernames who have liked this post
  isRepost?: boolean;
  originalPostId?: string;
  originalAuthor?: string;
  imageUrl?: string; // URL of the uploaded image
  comments: Comment[];
  profilePicture?: string; // URL of the author's profile picture
  portfolioValue?: {
    totalValue: number;
    showValue: boolean;
  };
} 