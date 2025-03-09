import { Post } from '../types/post';

const BIN_ID = '65f9d2c8266cfc3fde8c5f2b';
const API_KEY = '$2a$10$Gy5JRPPBxBGBWXVfvzQWxOXZNVBGzEJFyN8B6Oq9zqFBHFfDwSVGi';

export const api = {
  async fetchPosts(): Promise<Post[]> {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': API_KEY,
          'X-Bin-Meta': 'false'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const posts = await response.json();
      return Array.isArray(posts) ? posts : [];
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  },
  
  async savePosts(posts: Post[]): Promise<void> {
    try {
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY
        },
        body: JSON.stringify(posts)
      });
    } catch (error) {
      console.error('Error saving posts:', error);
    }
  },
  
  // Function to periodically sync posts
  startSync(setPosts: (posts: Post[]) => void) {
    // Initial fetch
    this.fetchPosts().then(setPosts);
    
    // Sync every 30 seconds
    return setInterval(async () => {
      const posts = await this.fetchPosts();
      setPosts(posts);
    }, 30000);
  }
}; 