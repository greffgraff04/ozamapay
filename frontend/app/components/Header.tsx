import { BellIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export const Header = () => {
  return (
    <header className="flex justify-between items-center py-6 px-4 bg-ozama-dark">
      <div className="flex items-center gap-3">
        {/* Logo Image */}
        <div className="w-12 h-12 rounded-lg overflow-hidden">
          <Image
            src="/logo.png"
            alt="OZAMAPAY Logo"
            width={48}
            height={48}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1 className="text-white font-bold tracking-tight text-lg">OZAMAPAY</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-ozama-gray hover:text-white transition-colors">
          <BellIcon className="w-6 h-6" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-ozama-orange rounded-full border-2 border-ozama-dark"></span>
        </button>
        <button className="p-2 text-ozama-gray hover:text-white transition-colors">
          <Bars3Icon className="w-7 h-7" />
        </button>
      </div>
    </header>
  );
};