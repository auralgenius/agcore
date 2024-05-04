'use client';

import RecordedfileItemCard from '@/components/pages/dashboard/RecordedfileItemCard';
import { api } from '@/convex/_generated/api';
import { Preloaded, useAction } from 'convex/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import AuthenticatedPreload from '@/components/preloading';
import { FunctionReturnType } from 'convex/server';

import Web3 from 'web3';

export interface Auth {
	accessToken: string;
}

export interface Props {
	onLoggedIn: (auth: Auth) => void;
}

// Enable us to use "window.ethereum".
declare global {
	interface Window {
		ethereum: any;
	}
}

interface State {
	auth?: Auth;
}

let web3: Web3 | undefined; // Will hold the web3 instance

const PreloadedProfileHomePage = ({
  preloadedNotes,
}: {
  preloadedNotes: Preloaded<typeof api.notes.getNotes>;
}) => {
  return (
    <AuthenticatedPreload preload={preloadedNotes}>
      <ProfileHomePage preloaded={undefined} />
    </AuthenticatedPreload>
  );
};

const ProfileHomePage = ({
  preloaded,
}: {
  preloaded: FunctionReturnType<typeof api.notes.getNotes> | undefined;
}) => {
  const allNotes = preloaded!;
  const [searchQuery, setSearchQuery] = useState('');
  const [publicAddress, setPublicAddress] = useState('');  // 状态用于保存publicAddress
  const [relevantNotes, setRelevantNotes] =
    useState<FunctionReturnType<typeof api.notes.getNotes>>();

  const performMyAction = useAction(api.together.similarNotes);

  const handleSearch = async (e: any) => {
    e.preventDefault();

    console.log({ searchQuery });
    if (searchQuery === '') {
      setRelevantNotes(undefined);
    } else {
      const scores = await performMyAction({ searchQuery: searchQuery });
      const scoreMap: Map<string, number> = new Map();
      for (const s of scores) {
        scoreMap.set(s.id, s.score);
      }
      const filteredResults = allNotes.filter(
        (note) => (scoreMap.get(note._id) ?? 0) > 0.6,
      );
      setRelevantNotes(filteredResults);
    }
  };

  const finalNotes = relevantNotes ?? allNotes;

  const [loading, setLoading] = useState(false); // Loading button state

	const handleAuthenticate = ({
		publicAddress,
		signature,
	}: {
		publicAddress: string;
		signature: string;
	}) =>
		fetch(`auth`, {
			body: JSON.stringify({ publicAddress, signature }),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
		}).then((response) => response.json());

	const handleSignMessage = async ({
		publicAddress,
		nonce,
	}: {
		publicAddress: string;
		nonce: string;
	}) => {
		try {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore because web3 is defined here.
			const signature = await web3.eth.personal.sign(
				`I am signing my one-time nonce: ${nonce}`,
				publicAddress,
				'' // MetaMask will ignore the password argument here
			);

			return { publicAddress, signature };
		} catch (err) {
			throw new Error(
				'You need to sign the message to be able to log in.'
			);
		}
	};

	const handleSignup = (publicAddress: string) =>
		fetch(`/users`, {
			body: JSON.stringify({ publicAddress }),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
		}).then((response) => response.json());

    const handleClick = async () => {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        window.alert('Please install MetaMask first.');
        return;
      }
  
      if (!web3) {
        try {
          // Request account access if needed
          await window.ethereum.enable();
  
          // We don't know window.web3 version, so we use our own instance of Web3
          // with the injected provider given by MetaMask
          web3 = new Web3(window.ethereum);
        } catch (error) {
          window.alert('You need to allow MetaMask.');
          return;
        }
      }
  
      const coinbase = await web3.eth.getCoinbase();
      if (!coinbase) {
        window.alert('Please activate MetaMask first.');
        return;
      }
  
      const publicAddress = coinbase.toLowerCase();
      setPublicAddress(publicAddress);  // 更新状态
      setLoading(true);

      setLoading(true);
      const nonce = 'defaultNonce';  // 实际应用中应从后端获取或更安全地生成
      if (publicAddress) {
        // 当 publicAddress 为空时，直接弹出 MetaMask 签名
        handleSignMessage({ publicAddress: '', nonce })
          .then(handleAuthenticate)
          .catch((err) => {
            window.alert(err);
            setLoading(false);
          });
      }
      // Look if user with current publicAddress is already present on backend
      fetch(
        `users?publicAddress=${publicAddress}`
      )
        .then((response) => response.json())
        // If yes, retrieve it. If no, create it.
        .then((users) =>
          users.length ? users[0] : handleSignup(publicAddress)
        )
        // Popup MetaMask confirmation modal to sign message
        .then(handleSignMessage)
        // Send signature to backend on the /auth route
        .then(handleAuthenticate)
        .catch((err) => {
          window.alert(err);
          setLoading(false);
        });
    };
  
  return (
    <div suppressHydrationWarning={true} className="mt-5 min-h-[100vh] w-full">
      <div className="mx-auto w-4/5 py-[23px] md:py-4 lg:py-[25px] flex justify-between items-center">
        <h1 className="text-left text-2xl font-medium text-dark md:text-3xl">
          Profile {publicAddress}
        </h1>
        <h2 className="text-right text-xl text-dark md:text-2xl">
          Points: {1000}
        </h2>
      </div>

      {/* Divider */}
      <hr className="mx-auto w-4/5 bg-gray-300" style={{ height: '1px' }} />
      
      <div className="mx-auto w-4/5 mb-10 mt-4">
      <div className="grid grid-cols-4 gap-4">
        {/* Manually creating each card */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #1</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>

        {/* Repeat the block manually for each item from #2 to #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #2</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>

        {/* Repeat the block manually for each item from #3 to #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #3</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>
        {/* Repeat the block manually for each item from #4 to #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #4</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>
        {/* Repeat the block manually for each item from #5 to #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #5</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>
        {/* Repeat the block manually for each item from #6 to #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #6</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>
        {/* Repeat the block manually for each item from #7 to #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #7</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>
        {/* Example for the last one, Zstars #8 */}
        <div className="flex flex-col items-center bg-white rounded-lg border border-gray-300 shadow-md p-4">
          <div className="mb-2">
            <Image
              src="/images/nfts.avif"
              alt="NFT Example"
              width={300}
              height={300}
              className="rounded-lg"
            />
          </div>
          <p className="mb-2 text-sm text-gray-600">Zstars #8</p>
          <p className="text-lg font-semibold text-gray-900">Price 0.0001 ETH</p>
          <button
            className="mt-2 rounded bg-dark text-white px-4 py-2 text-sm uppercase shadow-sm hover:bg-dark-hover"
            onClick={handleClick}
          >
            Mint
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default PreloadedProfileHomePage;
