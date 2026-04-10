import React from 'react';
import { Mic, Command } from 'lucide-react';

const OmniCommand = () => {
  return (
    <div className='relative group w-[600px] max-w-full'>
      <div className='absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full opacity-30 group-hover:opacity-70 blur transition duration-500' />
      <div className='relative flex items-center bg-slate-950 rounded-full px-4 py-3 border border-slate-800 shadow-2xl'>
        <Command className='w-5 h-5 text-slate-500 mr-3' />
        <input
          type='text'
          placeholder="Ask anything... (e.g., 'Show me today&apos;s schedule')"
          className='bg-transparent border-none outline-none text-white w-full placeholder-slate-600 font-mono'
        />
        <button className='p-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors'>
          <Mic className='w-5 h-5' />
        </button>
      </div>
    </div>
  );
};

export default OmniCommand;
