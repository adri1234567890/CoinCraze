import React, { useEffect, useState, useRef } from 'react';
import { CurrencyDollarIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import Decimal from 'decimal.js';

// Define TradingView types
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
  }
}

interface CryptoData {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: string;
  totalSupply: string;
}

// Simple AMM implementation
class AMM {
  private tokenLiquidity: Decimal;
  private ethLiquidity: Decimal;
  private k: Decimal;

  constructor(tokenLiquidity: number, ethLiquidity: number) {
    this.tokenLiquidity = new Decimal(tokenLiquidity);
    this.ethLiquidity = new Decimal(ethLiquidity);
    this.k = this.tokenLiquidity.mul(this.ethLiquidity);
  }

  getTokenPrice(): number {
    return this.ethLiquidity.div(this.tokenLiquidity).toNumber();
  }

  buyTokens(ethAmount: number): { tokens: number; newPrice: number } {
    const ethAmountDecimal = new Decimal(ethAmount);
    const newEthLiquidity = this.ethLiquidity.add(ethAmountDecimal);
    const newTokenLiquidity = this.k.div(newEthLiquidity);
    const tokensReceived = this.tokenLiquidity.sub(newTokenLiquidity);
    
    this.ethLiquidity = newEthLiquidity;
    this.tokenLiquidity = newTokenLiquidity;
    
    return {
      tokens: tokensReceived.toNumber(),
      newPrice: this.getTokenPrice()
    };
  }

  sellTokens(tokenAmount: number): { eth: number; newPrice: number } {
    const tokenAmountDecimal = new Decimal(tokenAmount);
    const newTokenLiquidity = this.tokenLiquidity.add(tokenAmountDecimal);
    const newEthLiquidity = this.k.div(newTokenLiquidity);
    const ethReceived = this.ethLiquidity.sub(newEthLiquidity);
    
    this.ethLiquidity = newEthLiquidity;
    this.tokenLiquidity = newTokenLiquidity;
    
    return {
      eth: ethReceived.toNumber(),
      newPrice: this.getTokenPrice()
    };
  }
}

// Add global styles
const globalStyles = `
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #000000;
  }
  ::-webkit-scrollbar-thumb {
    background: #2f3336;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #404548;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #2f3336 #000000;
  }
`;

interface CoinViewProps {
  onBack: () => void;
  balance: number;
  setBalance: (balance: number) => void;
  investedAmount: number;
  setInvestedAmount: (amount: number) => void;
  setGlobalOwnedSolana: (amount: number) => void;
  setGlobalSolanaPrice: (price: number) => void;
  initialOwnedSolana: number;
  setInitialInvestedPrice: (price: number) => void;
}

const SolanaView: React.FC<CoinViewProps> = ({ 
  onBack, 
  balance, 
  setBalance,
  investedAmount,
  setInvestedAmount,
  setGlobalOwnedSolana,
  setGlobalSolanaPrice,
  initialOwnedSolana,
  setInitialInvestedPrice
}) => {
  const [amount, setAmount] = useState('');
  const [sellPercentage, setSellPercentage] = useState(0);
  const [isSelling, setIsSelling] = useState(false);
  const [ownedSolana, setOwnedSolana] = useState(initialOwnedSolana);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [marketCap, setMarketCap] = useState('Loading...');
  const [change24h, setChange24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  const fetchCurrentPrice = async (attempt = 0) => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.solana && data.solana.usd) {
        setCurrentPrice(data.solana.usd);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (error) {
      console.error('Error fetching Solana price:', error);
      
      // Implement exponential backoff for retries
      if (attempt < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        setTimeout(() => fetchCurrentPrice(attempt + 1), backoffTime);
      }
      
      setRetryCount(prev => prev + 1);
    }
  };

  // Separate function for initial price fetch with more aggressive retry
  const initialPriceFetch = async () => {
    // Try to fetch immediately
    await fetchCurrentPrice();
    
    // If price is still 0, retry quickly a few times
    if (currentPrice === 0) {
      for (let i = 0; i < 3; i++) {
        if (currentPrice === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchCurrentPrice();
        } else {
          break;
        }
      }
    }
  };

  const fetchMarketData = async (attempt = 0) => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_market_cap=true&include_24hr_change=true',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.solana && data.solana.usd_market_cap) {
        const marketCapValue = data.solana.usd_market_cap;
        
        let formattedMarketCap;
        if (marketCapValue >= 1e9) {
          formattedMarketCap = `$${(marketCapValue / 1e9).toFixed(2)}B`;
        } else if (marketCapValue >= 1e6) {
          formattedMarketCap = `$${(marketCapValue / 1e6).toFixed(2)}M`;
        } else {
          formattedMarketCap = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(marketCapValue);
        }
        
        setMarketCap(formattedMarketCap);
        setChange24h(data.solana.usd_24h_change || 0);
        setIsLoading(false);
      } else {
        throw new Error('Invalid market data received');
      }
    } catch (error) {
      console.error('Error fetching Solana market data:', error);
      
      // Implement exponential backoff for retries
      if (attempt < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        setTimeout(() => fetchMarketData(attempt + 1), backoffTime);
      }
    }
  };

  useEffect(() => {
    // Initial fetch with aggressive retry
    initialPriceFetch();
    fetchMarketData();

    // Set up intervals
    const priceInterval = setInterval(fetchCurrentPrice, 1000);
    const marketDataInterval = setInterval(() => fetchMarketData(), 30000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(marketDataInterval);
    };
  }, []);

  useEffect(() => {
    // Add global styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = globalStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const coinData: CryptoData = {
    name: 'Solana',
    symbol: 'SOL',
    price: currentPrice,
    change24h: change24h,
    marketCap: marketCap,
    totalSupply: 'Loading...',
  };

  const handleBuy = () => {
    const usdAmount = parseFloat(amount);
    if (isNaN(usdAmount) || usdAmount <= 0) return;
    if (usdAmount > balance) return;

    // Calculate SOL amount based on current price
    const solAmount = usdAmount / currentPrice;
    
    // Update balances and state
    setOwnedSolana(prev => {
      const newAmount = prev + solAmount;
      setGlobalOwnedSolana(newAmount);
      return newAmount;
    });
    setGlobalSolanaPrice(currentPrice);
    setInitialInvestedPrice(currentPrice);
    setBalance(balance - usdAmount);
    setInvestedAmount(investedAmount + usdAmount);
    setAmount('');
  };

  const handleSellPercentageChange = (percentage: number) => {
    setSellPercentage(percentage);
    if (percentage === 100) {
      // When selling 100%, sell exact amount of owned SOL
      setAmount(ownedSolana.toString());
    } else {
      const solAmount = (percentage / 100) * ownedSolana;
      setAmount(solAmount.toFixed(4));
    }
  };

  const handleSellAmountChange = (value: string) => {
    setAmount(value);
    const solAmount = parseFloat(value);
    if (!isNaN(solAmount) && ownedSolana > 0) {
      const percentage = (solAmount / ownedSolana) * 100;
      setSellPercentage(Math.min(100, Math.max(0, percentage)));
    } else {
      setSellPercentage(0);
    }
  };

  const handleSell = () => {
    const solAmount = parseFloat(amount);
    if (isNaN(solAmount) || solAmount <= 0) return;
    if (solAmount > ownedSolana) return;

    // Calculate USD value based on current price
    const usdValue = solAmount * currentPrice;
    
    // Calculate remaining SOL after sale
    const remainingSol = ownedSolana - solAmount;
    
    // Update balances
    setBalance(balance + usdValue);
    
    // If selling all SOL or very close to all (less than $0.01 worth)
    if (remainingSol * currentPrice < 0.01) {
      setInvestedAmount(0);
      setOwnedSolana(0);
      setGlobalOwnedSolana(0);
    } else {
      // Otherwise reduce proportionally
      setInvestedAmount((remainingSol / ownedSolana) * investedAmount);
      setOwnedSolana(remainingSol);
      setGlobalOwnedSolana(remainingSol);
    }
    
    setAmount('');
    setSellPercentage(0);
    setIsSelling(false);
  };

  useEffect(() => {
    setGlobalOwnedSolana(ownedSolana);
  }, [ownedSolana, setGlobalOwnedSolana]);

  useEffect(() => {
    setGlobalSolanaPrice(currentPrice);
  }, [currentPrice, setGlobalSolanaPrice]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (typeof window.TradingView !== 'undefined') {
          new window.TradingView.widget({
            width: '100%',
            height: 500,
            symbol: 'BINANCE:SOLUSD',
            interval: '1',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#111111',
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: false,
            container_id: 'tradingview_chart',
            backgroundColor: '#111111',
            gridColor: '#1f1f1f',
          });
        }
      }, 1000); // Add a delay to ensure the container is ready
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full bg-black text-white">
      <div className="sticky top-0 z-[1] bg-black">
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center">
          <button
            onClick={onBack}
            className="mr-4 text-gray-400 hover:text-white transition-colors"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">Solana Price Chart</h1>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Token Overview */}
        <div className="border-b border-zinc-800 pb-8">
          <h2 className="text-lg font-bold mb-6">Token Overview</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#111111] rounded-lg p-6">
              <p className="text-gray-400">Current Price</p>
              <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
            </div>
            <div className="bg-[#111111] rounded-lg p-6">
              <p className="text-gray-400">24h Change</p>
              <p className={`text-2xl font-bold ${coinData.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {coinData.change24h.toFixed(2)}%
              </p>
            </div>
            <div className="bg-[#111111] rounded-lg p-6">
              <p className="text-gray-400">Market Cap</p>
              <p className="text-2xl font-bold">{marketCap}</p>
            </div>
            <div className="bg-[#111111] rounded-lg p-6">
              <p className="text-gray-400">Your SOL Balance</p>
              <p className="text-2xl font-bold">{ownedSolana.toFixed(4)} SOL</p>
              <div className="space-y-1 mt-1">
                <p className="text-sm text-gray-500">≈ ${(ownedSolana * currentPrice).toFixed(2)}</p>
                {ownedSolana >= 0.0001 && investedAmount > 0 && currentPrice > 0 && (
                  <p className={`text-sm ${
                    (ownedSolana * currentPrice) >= investedAmount 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {(ownedSolana * currentPrice) >= investedAmount ? '+' : '-'}$
                    {Math.abs((ownedSolana * currentPrice) - investedAmount).toFixed(2)}
                    {' '}
                    ({(((ownedSolana * currentPrice) - investedAmount) / investedAmount * 100).toFixed(2)}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="border-b border-zinc-800 pb-8">
          <div className="bg-[#111111] rounded-lg p-6">
            <h3 className="text-lg font-bold mb-6">Price Chart</h3>
            <div className="h-[500px] w-full" id="tradingview_chart">
              {/* TradingView widget will be loaded here */}
            </div>
          </div>
        </div>

        {/* Trading Interface */}
        <div className="bg-[#111111] rounded-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="bg-[#111111] p-2 rounded-full w-14 h-14 flex items-center justify-center">
                <img
                  src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                  alt="Solana"
                  className="w-full h-full rounded-full"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold">{coinData.name}</h3>
                <p className="text-gray-400">{coinData.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-lg p-4 border border-zinc-800 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />
                    <span className="text-gray-400">Available Balance:</span>
                    <span className="font-bold">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Total Balance:</span>
                    <span className="font-bold">${(balance + (ownedSolana * currentPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {investedAmount > 0 && (
                      <span className={`ml-2 text-sm ${((ownedSolana * currentPrice) - investedAmount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({((ownedSolana * currentPrice) - investedAmount) >= 0 ? '+' : ''}
                        ${((ownedSolana * currentPrice) - investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    )}
                  </div>
                  {investedAmount > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Invested Amount:</span>
                      <span className="font-bold">${investedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {investedAmount > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">Profit/Loss:</span>
                      <span className={`font-bold ${((ownedSolana * currentPrice) - investedAmount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {((ownedSolana * currentPrice) - investedAmount) >= 0 ? '+' : ''}
                        ${((ownedSolana * currentPrice) - investedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {' '}
                        ({(((ownedSolana * currentPrice) - investedAmount) / investedAmount * 100).toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setBalance(100000);
                    setInvestedAmount(0);
                    setOwnedSolana(0);
                    setGlobalOwnedSolana(0);
                    setAmount('');
                    setSellPercentage(0);
                    setIsSelling(false);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Reset Wallet
                </button>
              </div>
            </div>

            {!isSelling ? (
              // Buy Interface
              <div className="flex space-x-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount in USD"
                  className="flex-1 bg-black rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleBuy}
                  disabled={parseFloat(amount) > balance || balance <= 0}
                  className={`bg-emerald-500 text-white rounded-lg px-6 py-3 hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium ${
                    parseFloat(amount) > balance || balance <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setIsSelling(true)}
                  disabled={ownedSolana <= 0}
                  className={`bg-red-500 text-white rounded-lg px-6 py-3 hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 font-medium ${
                    ownedSolana <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Sell
                </button>
              </div>
            ) : (
              // Sell Interface
              <div className="space-y-4">
                <div className="flex space-x-2 mb-4">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => handleSellPercentageChange(percent)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-4 py-2 transition-colors text-sm font-medium"
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
                <div className="bg-black rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Sell amount:</span>
                    <span className="text-white font-bold">{sellPercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sellPercentage}
                    onChange={(e) => handleSellPercentageChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs text-gray-500">50%</span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => handleSellAmountChange(e.target.value)}
                    placeholder="Enter amount in SOL"
                    className="flex-1 bg-black rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSell}
                    disabled={parseFloat(amount) > ownedSolana || ownedSolana <= 0}
                    className="bg-red-500 text-white rounded-lg px-6 py-3 hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setIsSelling(false);
                      setAmount('');
                      setSellPercentage(0);
                    }}
                    className="bg-zinc-700 text-white rounded-lg px-6 py-3 hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 font-medium"
                  >
                    Cancel
                  </button>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount to sell:</span>
                  <span className="text-white">{amount || '0'} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You will receive:</span>
                  <span className="text-emerald-500">${((parseFloat(amount) || 0) * currentPrice).toFixed(2)}</span>
                </div>
              </div>
            )}

            {ownedSolana > 0 && (
              <p className="text-sm text-gray-500">
                Your SOL value: ${(ownedSolana * currentPrice).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CoinSelection: React.FC<{ 
  onSelect: (coin: string) => void; 
  balance: number;
  investedAmount: number;
  setBalance: (balance: number) => void;
  setInvestedAmount: (amount: number) => void;
  setOwnedSolana: (amount: number) => void;
  ownedSolana?: number;
}> = ({ 
  onSelect, 
  balance,
  investedAmount,
  setBalance,
  setInvestedAmount,
  setOwnedSolana,
  ownedSolana = 0
}) => {
  const handleReset = () => {
    setBalance(100000);
    setInvestedAmount(0);
    setOwnedSolana(0);
  };

  return (
    <div className="w-full bg-black text-white min-h-screen">
      <div className="sticky top-0 z-[1] bg-black">
        <div className="px-6 py-3 border-b border-zinc-800">
          <h1 className="text-xl font-bold">Select a Cryptocurrency</h1>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid gap-4">
          <button
            onClick={() => onSelect('solana')}
            className="bg-[#111111] hover:bg-[#1a1a1a] transition-colors rounded-lg p-6 flex items-center space-x-4 border border-zinc-800"
          >
            <div className="bg-[#111111] p-2 rounded-full w-12 h-12 flex items-center justify-center">
              <img
                src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                alt="Solana"
                className="w-full h-full rounded-full"
              />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold">Solana</h3>
              <p className="text-gray-400 text-sm">SOL</p>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          
          {/* Placeholder for future coins */}
          <div className="bg-[#111111] rounded-lg p-6 flex items-center space-x-4 border border-zinc-800 opacity-50 cursor-not-allowed">
            <div className="bg-gray-500 p-3 rounded-full">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold">More coins coming soon</h3>
              <p className="text-gray-400 text-sm">Stay tuned!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CryptoProps {
  balance: number;
  setBalance: (balance: number) => void;
  investedAmount: number;
  setInvestedAmount: (amount: number) => void;
  setOwnedSolana: (amount: number) => void;
  setSolanaPrice: (price: number) => void;
  ownedSolana: number;
  setInitialInvestedPrice: (price: number) => void;
}

const Crypto: React.FC<CryptoProps> = ({ 
  balance, 
  setBalance, 
  investedAmount, 
  setInvestedAmount,
  setOwnedSolana,
  setSolanaPrice,
  ownedSolana,
  setInitialInvestedPrice
}) => {
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  useEffect(() => {
    // Add global styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = globalStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  if (selectedCoin === 'solana') {
    return (
      <SolanaView 
        onBack={() => setSelectedCoin(null)} 
        balance={balance} 
        setBalance={setBalance}
        investedAmount={investedAmount}
        setInvestedAmount={setInvestedAmount}
        setGlobalOwnedSolana={setOwnedSolana}
        setGlobalSolanaPrice={setSolanaPrice}
        initialOwnedSolana={ownedSolana}
        setInitialInvestedPrice={setInitialInvestedPrice}
      />
    );
  }

  return (
    <CoinSelection 
      onSelect={setSelectedCoin} 
      balance={balance}
      investedAmount={investedAmount}
      setBalance={setBalance}
      setInvestedAmount={setInvestedAmount}
      setOwnedSolana={setOwnedSolana}
      ownedSolana={ownedSolana}
    />
  );
};

export default Crypto; 
