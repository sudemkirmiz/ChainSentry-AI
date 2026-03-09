import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { WagmiProvider } from 'wagmi';
import { avalanche } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// 1. WalletConnect Cloud Project ID
//    Get yours free at https://cloud.walletconnect.com
// ---------------------------------------------------------------------------
const projectId = 'YOUR_PROJECT_ID_HERE';

// ---------------------------------------------------------------------------
// 2. Metadata shown inside the Web3Modal wallet connection dialog
// ---------------------------------------------------------------------------
const metadata = {
    name: 'ChainSentry AI',
    description: 'Smart Contract Security Analyzer on Avalanche',
    url: 'https://chainsentry.ai',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// ---------------------------------------------------------------------------
// 3. Wagmi Config – Avalanche C-Chain only
// ---------------------------------------------------------------------------
const chains = [avalanche];
const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
});

// ---------------------------------------------------------------------------
// 4. Create Web3Modal instance
// ---------------------------------------------------------------------------
createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: false,
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#22d3ee',           // Cyan accent matching the app theme
        '--w3m-border-radius-master': '2px',
    },
});

// ---------------------------------------------------------------------------
// 5. React Query Client
// ---------------------------------------------------------------------------
const queryClient = new QueryClient();

// ---------------------------------------------------------------------------
// 6. Provider Wrapper Component
// ---------------------------------------------------------------------------
export function Web3Provider({ children }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
