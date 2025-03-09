import React, { useEffect, useState } from 'react';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';

interface WalletProps {
  balance: number;
  investedAmount: number;
  ownedSolana?: number;
  solanaPrice?: number;
  initialInvestedPrice?: number;
}

const Wallet: React.FC<WalletProps> = ({ 
  balance, 
  investedAmount,
  ownedSolana = 0,
  solanaPrice = 0,
  initialInvestedPrice = 0
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastValidPrice, setLastValidPrice] = useState<number>(solanaPrice || initialInvestedPrice || 0);

  // Update lastValidPrice when we receive a valid solanaPrice
  useEffect(() => {
    if (solanaPrice > 0) {
      setLastValidPrice(solanaPrice);
    }
  }, [solanaPrice]);

  // Use lastValidPrice if current price is 0
  const currentPrice = solanaPrice > 0 ? solanaPrice : lastValidPrice;

  // Calculate profit/loss
  const calculateProfitLoss = () => {
    if (ownedSolana && currentPrice && investedAmount > 0) {
      const currentValue = ownedSolana * currentPrice;
      return currentValue - investedAmount;
    }
    return 0;
  };

  const profitLoss = calculateProfitLoss();
  const profitLossPercentage = investedAmount > 0 ? (profitLoss / investedAmount) * 100 : 0;
  const totalValue = balance + (ownedSolana * currentPrice);
  const totalProfitLoss = profitLoss;
  const totalProfitLossPercentage = investedAmount > 0 ? (totalProfitLoss / investedAmount) * 100 : 0;

  // Format profit/loss display
  const formatProfitLoss = (amount: number, percentage: number) => {
    const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedPercentage = percentage.toFixed(2);
    const isPositive = amount >= 0;
    const sign = isPositive ? '+' : '';
    return {
      amount: `${sign}$${formattedAmount}`,
      percentage: `${sign}${formattedPercentage}%`,
      isPositive
    };
  };

  const totalProfitLossFormatted = formatProfitLoss(totalProfitLoss, totalProfitLossPercentage);
  const investedProfitLossFormatted = formatProfitLoss(profitLoss, profitLossPercentage);

  return (
    <div className="w-full bg-black text-white">
      <div className="sticky top-0 z-[1] bg-black">
        <div className="px-6 py-3 border-b border-zinc-800">
          <h1 className="text-xl font-bold">Wallet</h1>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#111111] rounded-lg p-8 border border-zinc-800">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-emerald-500 p-3 rounded-full">
                    <CurrencyDollarIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Total Balance</h2>
                    <p className="text-gray-400">Your total portfolio value</p>
                  </div>
                </div>
                {totalProfitLoss !== 0 && (
                  <div className={`flex items-center space-x-2 ${totalProfitLossFormatted.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {totalProfitLossFormatted.isPositive ? (
                      <ArrowTrendingUpIcon className="h-6 w-6" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-6 w-6" />
                    )}
                    <div className="text-right">
                      <p className="font-bold">{totalProfitLossFormatted.amount}</p>
                      <p className="text-sm">{totalProfitLossFormatted.percentage}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <p className="text-4xl font-bold">
                      ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-[#111111] rounded-lg p-6 border border-zinc-800">
            <div className="flex items-center space-x-3 mb-4">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-bold">Available Balance</h3>
            </div>
            <p className="text-3xl font-bold">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-gray-400 mt-2">Ready to trade</p>
          </div>

          <div className="bg-[#111111] rounded-lg p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-bold">Invested Amount</h3>
              </div>
              {profitLoss !== 0 && (
                <div className={`flex items-center space-x-2 ${investedProfitLossFormatted.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {investedProfitLossFormatted.isPositive ? (
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-5 w-5" />
                  )}
                  <div className="text-right">
                    <p className="font-bold">{investedProfitLossFormatted.amount}</p>
                    <p className="text-sm">{investedProfitLossFormatted.percentage}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold">
                ${(ownedSolana * currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex justify-between items-baseline">
                <p className="text-sm text-gray-400">
                  {ownedSolana.toFixed(4)} SOL
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Distribution */}
        <div className="bg-[#111111] rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-bold mb-4">Portfolio Distribution</h3>
          <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-500"
              style={{ 
                width: `${(balance / totalValue) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-gray-400">Available ({((balance / totalValue) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-zinc-800 rounded-full" />
              <span className="text-gray-400">Invested ({((ownedSolana * currentPrice) / totalValue * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Crypto Holdings */}
        <div className="bg-[#111111] rounded-lg p-6 border border-zinc-800">
          <h3 className="text-lg font-bold mb-4">Your Crypto</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black rounded-lg">
              <div className="flex items-center space-x-3">
                <img
                  src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                  alt="Solana"
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h4 className="font-bold">Solana</h4>
                  <p className="text-sm text-gray-500">SOL</p>
                  <p className="text-sm text-gray-500">Price: ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{ownedSolana.toFixed(4)} SOL</p>
                <p className="text-sm text-gray-500">≈ ${(ownedSolana * currentPrice).toFixed(2)}</p>
                {profitLoss !== 0 && (
                  <p className={`text-sm ${profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {profitLoss >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
                    {' '}(${Math.abs(profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet; 