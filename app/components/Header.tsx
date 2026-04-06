'use client';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img 
            src="/logo (1).jpg" 
            alt="The Code" 
            className="h-10 w-auto rounded-lg"
          />
          <span className="text-xl font-bold text-gray-900">Agenda</span>
        </div>
      </div>
    </header>
  );
}
