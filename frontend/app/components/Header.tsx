import { BellIcon, Bars3Icon } from '@heroicons/react/24/outline';

export const Header = () => {
  return (
    <header className="flex justify-between items-center py-6 px-4 bg-ozama-dark">
      <div className="flex items-center gap-3">
        {/* Le logo orange avec le 'O' */}
        <div className="w-10 h-10 rounded-full bg-ozama-orange flex items-center justify-center shadow-[0_0_15px_rgba(255,122,0,0.4)]">
          <span className="text-white font-bold text-xl">O</span>
        </div>
        <h1 className="text-white font-bold tracking-tight text-lg">OZAMA PAY</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-ozama-gray hover:text-white transition-colors">
          <BellIcon className="w-6 h-6" />
          {/* Le petit point orange de notification */}
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-ozama-orange rounded-full border-2 border-ozama-dark"></span>
        </button>
        <button className="p-2 text-ozama-gray hover:text-white transition-colors">
          <Bars3Icon className="w-7 h-7" />
        </button>
      </div>
    </header>
  );
};