import { ChevronRight, Home, Menu, Search } from "lucide-react";
import type { FolderRecord } from "../types";

interface TopBarProps {
  breadcrumbs: FolderRecord[];
  currentFolderId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onFileDropOnFolder: (
    fileId: string,
    targetFolderId: string | null,
    targetName: string
  ) => void;
  onToggleMobileSidebar: () => void;
}

export function TopBar({
  breadcrumbs,
  currentFolderId,
  searchQuery,
  onSearchChange,
  onSelectFolder,
  onFileDropOnFolder,
  onToggleMobileSidebar,
}: TopBarProps) {
  const dropToCrumb = (targetId: string | null, targetName: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("application/x-file-id")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    },
    onDrop: (e: React.DragEvent) => {
      const fileId = e.dataTransfer.getData("application/x-file-id");
      if (fileId) {
        e.preventDefault();
        onFileDropOnFolder(fileId, targetId, targetName);
      }
    },
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
      <div className="max-w-[1600px] mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4 lg:gap-6">
        {/* Left: Existing Logo + Brand Wordmark + Breadcrumb Trail */}
        <div className="flex items-center gap-4 min-w-0 lg:flex-1">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              aria-label="Open folders"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              className="flex items-center gap-2.5 group shrink-0 whitespace-nowrap"
              aria-label="Drag Drop home"
            >
              <span className="h-9 w-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0 group-hover:border-blue-300 transition-colors">
                <img
                  src="/assets/aistudio/image_3bc9add8.png"
                  alt="Drag Drop logo"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="font-preserved text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Drag <span className="text-[#155eef]">Drop</span>
              </span>
            </button>
          </div>

          <nav
            aria-label="Folder breadcrumbs"
            className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-500 overflow-x-auto scroll-thin min-w-0"
          >
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              {...dropToCrumb(null, "Home")}
              className={`font-preserved inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                currentFolderId === null
                  ? "bg-blue-50 text-[#155eef] font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Root</span>
            </button>

            {breadcrumbs.map((crumb, idx) => {
              const last = idx === breadcrumbs.length - 1;
              return (
                <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <button
                    type="button"
                    onClick={() => onSelectFolder(crumb.id)}
                    {...dropToCrumb(crumb.id, crumb.name)}
                    title={crumb.name}
                    className={`font-preserved px-2.5 py-1 rounded-lg transition-colors truncate max-w-[160px] whitespace-nowrap ${
                      last
                        ? "bg-blue-50 text-[#155eef] font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Center: Workspace Search Bar */}
        <div className="hidden md:flex justify-center w-full max-w-md shrink-0">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files or folders..."
              aria-label="Search files or folders"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#155eef] focus:ring-3 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        {/* Right spacer to keep search bar centered */}
        <div className="hidden lg:block lg:flex-1" aria-hidden="true" />
      </div>
    </header>
  );
}
