import { useCallback, useEffect, useState } from 'react';
import { CHAIN_ID, NETWORK_KEY } from '../config.js';
import { getWriteClient } from '../lib/clients.js';

const EXPECTED_CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`;

function detectProvider() {
  if (typeof window === 'undefined') return null;
  return window.ethereum || null;
}

/**
 * useWallet exposes the full wallet lifecycle: detect provider, connect,
 * disconnect, listen for account and chain changes, and switch the wallet
 * to the correct GenLayer chain.
 *
 * The write client is only constructed once the wallet is connected AND on
 * the correct chain, so consumers cannot accidentally submit a transaction
 * to a wrong network.
 */
export function useWallet() {
  const [provider] = useState(detectProvider());
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Read initial state without prompting the user.
  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    (async () => {
      try {
        const [accounts, chain] = await Promise.all([
          provider.request({ method: 'eth_accounts' }),
          provider.request({ method: 'eth_chainId' }),
        ]);
        if (cancelled) return;
        if (accounts && accounts.length > 0) setAddress(accounts[0]);
        setChainId(parseInt(chain, 16));
      } catch (err) {
        console.warn('wallet initial probe failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  // Subscribe to lifecycle events.
  useEffect(() => {
    if (!provider || !provider.on) return;
    const onAccounts = (accounts) => {
      setAddress(accounts && accounts.length > 0 ? accounts[0] : null);
    };
    const onChain = (hex) => setChainId(parseInt(hex, 16));
    provider.on('accountsChanged', onAccounts);
    provider.on('chainChanged', onChain);
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, [provider]);

  const connect = useCallback(async () => {
    setError(null);
    if (!provider) {
      setError(
        'No wallet detected. Install a browser wallet such as MetaMask, Rabby, or OKX Wallet.',
      );
      return;
    }
    setConnecting(true);
    try {
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });
      const next = accounts && accounts.length > 0 ? accounts[0] : null;
      setAddress(next);

      // Switch (or add) the Bradbury chain via the SDK helper, which
      // uses wallet_switchEthereumChain / wallet_addEthereumChain.
      const writeClient = getWriteClient(next, provider);
      if (writeClient) {
        try {
          await writeClient.connect(NETWORK_KEY);
        } catch (err) {
          console.warn('chain switch failed', err);
          setError(
            `Please switch your wallet to Genlayer Bradbury (chain ${CHAIN_ID}).`,
          );
        }
      }
      const chain = await provider.request({ method: 'eth_chainId' });
      setChainId(parseInt(chain, 16));
    } catch (err) {
      // 4001 = user rejected
      if (err?.code !== 4001) console.error(err);
      setError(err?.message || 'Wallet request failed.');
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    // EIP-1193 has no revoke API; simply forget the account locally.
    setAddress(null);
    setError(null);
  }, []);

  const onCorrectChain = chainId === CHAIN_ID;
  const writeClient =
    address && onCorrectChain && provider
      ? getWriteClient(address, provider)
      : null;

  return {
    provider,
    address,
    chainId,
    expectedChainId: CHAIN_ID,
    onCorrectChain,
    connect,
    disconnect,
    connecting,
    error,
    writeClient,
  };
}

export { EXPECTED_CHAIN_HEX };
