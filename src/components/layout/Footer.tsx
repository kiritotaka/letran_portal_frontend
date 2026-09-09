import React from 'react';
import { ShieldCheck, Cpu, GitCommit } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-3.5 px-4 lg:px-6 text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Server Online</span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">RBAC Authorization Framework</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Bảo vệ Route Guard & HOC
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            Port 3000
          </span>
          <span className="flex items-center gap-1">
            <GitCommit className="w-3.5 h-3.5" />
            v1.0.0-prod
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
