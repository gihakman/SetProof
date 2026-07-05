import React from 'react';
import { Header } from './components/Header.jsx';
import { Footer } from './components/Footer.jsx';
import { Hero } from './components/Hero.jsx';
import { HowItWorks } from './components/HowItWorks.jsx';
import { Dimensions } from './components/Dimensions.jsx';
import { Console } from './components/Console.jsx';
import { Developers } from './components/Developers.jsx';
import { useWallet } from './hooks/useWallet.js';

export default function App() {
  const wallet = useWallet();
  return (
    <div className="page">
      <Header wallet={wallet} />
      <main>
        <Hero />
        <HowItWorks />
        <Dimensions />
        <Console wallet={wallet} />
        <Developers />
      </main>
      <Footer />
    </div>
  );
}
