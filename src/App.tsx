import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Crypto from './components/Crypto';
import Wallet from './components/Wallet';
import { Post } from './types/post';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/localStorage';

const App = () => {
  // Initialize states with localStorage values
  const [posts, setPosts] = useState<Post[]>(() => loadFromLocalStorage.posts());
  const [isVerified, setIsVerified] = useState(() => loadFromLocalStorage.isVerified());
  const [profilePicture, setProfilePicture] = useState<string | null>(() => loadFromLocalStorage.profilePicture());
  const [username, setUsername] = useState(() => loadFromLocalStorage.username());
  const [balance, setBalance] = useState(() => loadFromLocalStorage.balance());
  
  // Initialize states with localStorage values or defaults
  const [investedAmount, setInvestedAmount] = useState(() => {
    const saved = localStorage.getItem('investedAmount');
    return saved ? parseFloat(saved) : 0;
  });
  
  const [ownedSolana, setOwnedSolana] = useState(() => {
    const saved = localStorage.getItem('ownedSolana');
    return saved ? parseFloat(saved) : 0;
  });
  
  const [solanaPrice, setSolanaPrice] = useState(() => {
    const saved = localStorage.getItem('solanaPrice');
    return saved ? parseFloat(saved) : 0;
  });

  const [initialInvestedPrice, setInitialInvestedPrice] = useState(() => {
    const saved = localStorage.getItem('initialInvestedPrice');
    return saved ? parseFloat(saved) : 0;
  });

  // Add loading state management
  const [isPriceFetching, setIsPriceFetching] = useState(false);
  const [lastSuccessfulPrice, setLastSuccessfulPrice] = useState<number | null>(() => {
    const saved = localStorage.getItem('lastSuccessfulPrice');
    return saved ? parseFloat(saved) : null;
  });

  // Improved price fetching with better error handling and fallbacks
  const fetchCurrentPrice = async (retryCount = 0) => {
    if (isPriceFetching) return;
    
    try {
      setIsPriceFetching(true);
      
      // Try multiple API endpoints in case one fails
      const endpoints = [
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
        'https://api.kraken.com/0/public/Ticker?pair=SOLUSD'
      ];

      let price = null;
      let error: Error | null = null;

      // Try each endpoint until we get a valid price
      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(endpoint, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) continue;

          const data = await response.json();
          
          // Parse price based on the endpoint
          if (endpoint.includes('coingecko')) {
            price = data.solana?.usd;
          } else if (endpoint.includes('binance')) {
            price = parseFloat(data.price);
          } else if (endpoint.includes('kraken')) {
            price = parseFloat(data.result?.SOLUSD?.c?.[0]);
          }

          if (price && !isNaN(price) && price > 0) {
            break; // We got a valid price, exit the loop
          }
        } catch (e) {
          error = e instanceof Error ? e : new Error('Unknown error occurred');
          continue; // Try next endpoint
        }
      }

      if (price && !isNaN(price) && price > 0) {
        setSolanaPrice(price);
        setLastSuccessfulPrice(price);
        localStorage.setItem('lastSuccessfulPrice', price.toString());
        localStorage.setItem('lastPriceUpdateTime', Date.now().toString());
      } else {
        throw new Error(error?.message || 'Failed to fetch price from all endpoints');
      }
    } catch (error: any) {
      console.error('Error fetching Solana price:', error);
      
      // Use fallback prices in this order:
      // 1. Last successful price from current session
      // 2. Last saved price from localStorage
      // 3. Last known initial investment price
      if (lastSuccessfulPrice !== null) {
        setSolanaPrice(lastSuccessfulPrice);
      } else {
        const savedPrice = localStorage.getItem('lastSuccessfulPrice');
        if (savedPrice) {
          const price = parseFloat(savedPrice);
          if (!isNaN(price) && price > 0) {
            setSolanaPrice(price);
            setLastSuccessfulPrice(price);
          } else if (initialInvestedPrice > 0) {
            setSolanaPrice(initialInvestedPrice);
            setLastSuccessfulPrice(initialInvestedPrice);
          }
        }
      }
      
      // Implement exponential backoff for retries with max 3 attempts
      if (retryCount < 3) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => fetchCurrentPrice(retryCount + 1), backoffTime);
      }
    } finally {
      setIsPriceFetching(false);
    }
  };

  // Set up price fetching intervals with different frequencies
  useEffect(() => {
    // Initial fetch
    fetchCurrentPrice();

    // Fast updates when the app is active (every 10 seconds)
    const fastInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCurrentPrice();
      }
    }, 10000);

    // Slower backup interval for when the app is in background (every 30 seconds)
    const backupInterval = setInterval(() => {
      const lastUpdateTime = localStorage.getItem('lastPriceUpdateTime');
      const now = Date.now();
      if (!lastUpdateTime || now - parseInt(lastUpdateTime) > 30000) {
        fetchCurrentPrice();
      }
    }, 30000);

    // Fetch price when the window regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastUpdateTime = localStorage.getItem('lastPriceUpdateTime');
        const now = Date.now();
        if (!lastUpdateTime || now - parseInt(lastUpdateTime) > 5000) {
          fetchCurrentPrice();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fetch price when online status changes
    const handleOnline = () => {
      fetchCurrentPrice();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(fastInterval);
      clearInterval(backupInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Save to localStorage whenever values change
  useEffect(() => {
    localStorage.setItem('userBalance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('investedAmount', investedAmount.toString());
  }, [investedAmount]);

  useEffect(() => {
    localStorage.setItem('ownedSolana', ownedSolana.toString());
  }, [ownedSolana]);

  useEffect(() => {
    localStorage.setItem('solanaPrice', solanaPrice.toString());
  }, [solanaPrice]);

  useEffect(() => {
    localStorage.setItem('initialInvestedPrice', initialInvestedPrice.toString());
  }, [initialInvestedPrice]);

  // Save states to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage.posts(posts);
  }, [posts]);

  useEffect(() => {
    saveToLocalStorage.isVerified(isVerified);
  }, [isVerified]);

  useEffect(() => {
    saveToLocalStorage.profilePicture(profilePicture);
  }, [profilePicture]);

  useEffect(() => {
    saveToLocalStorage.username(username);
  }, [username]);

  useEffect(() => {
    saveToLocalStorage.balance(balance);
  }, [balance]);

  const trendingPosts = useMemo(() => {
    return posts
      .filter(post => post.likes >= 5)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);
  }, [posts]);

  return (
    <Router>
      <div className="min-h-screen w-full bg-black">
        <div className="flex w-full">
          <div className="fixed w-[275px] h-screen bg-black border-r border-zinc-800">
            <Sidebar 
              posts={posts}
              setPosts={setPosts}
              currentUser={username}
              profilePicture={profilePicture}
            />
          </div>
          <div className="flex-1 min-h-screen ml-[275px] mr-[300px]">
            <Routes>
              <Route 
                path="/" 
                element={
                  <Feed 
                    posts={posts} 
                    setPosts={setPosts} 
                    currentUser={username}
                    isVerified={isVerified}
                    profilePicture={profilePicture}
                    balance={balance}
                    ownedSolana={ownedSolana}
                    solanaPrice={solanaPrice}
                  />
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <Profile 
                    username={username}
                    setUsername={setUsername}
                    posts={posts}
                    setPosts={setPosts}
                    isVerified={isVerified}
                    setIsVerified={setIsVerified}
                    profilePicture={profilePicture}
                    setProfilePicture={setProfilePicture}
                    balance={balance}
                    setBalance={setBalance}
                    ownedSolana={ownedSolana}
                    solanaPrice={solanaPrice}
                  />
                } 
              />
              <Route 
                path="/crypto" 
                element={
                  <Crypto 
                    balance={balance}
                    setBalance={setBalance}
                    investedAmount={investedAmount}
                    setInvestedAmount={setInvestedAmount}
                    setOwnedSolana={setOwnedSolana}
                    setSolanaPrice={setSolanaPrice}
                    ownedSolana={ownedSolana}
                    setInitialInvestedPrice={setInitialInvestedPrice}
                  />
                } 
              />
              <Route 
                path="/wallet" 
                element={
                  <Wallet 
                    balance={balance}
                    investedAmount={investedAmount}
                    ownedSolana={ownedSolana}
                    solanaPrice={solanaPrice}
                    initialInvestedPrice={initialInvestedPrice}
                  />
                } 
              />
            </Routes>
          </div>
          <div className="fixed right-0 w-[300px] h-screen bg-black border-l border-zinc-800 overflow-y-auto">
            <div className="p-4">
              <div className="bg-[#111111] rounded-lg p-4">
                <h2 className="text-xl font-bold text-white mb-4">Trending</h2>
                {trendingPosts.length > 0 ? (
                  <div className="space-y-4">
                    {trendingPosts.map(post => (
                      <div key={post.id} className="p-3 hover:bg-gray-900 rounded-lg transition-colors">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-bold text-white">{post.author}</span>
                          <span className="text-gray-500">· {post.likes} likes</span>
                        </div>
                        <p className="text-gray-300 text-sm line-clamp-2">{post.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No trending posts yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App; 