export interface FolderRecord {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  item_count?: number;
}

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  content: string | null;
  folder_id: string | null;
  created_at: string;
}

export interface WorkspaceStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
}

export type ViewFilter = "folder" | "all" | "text" | "images" | "recent";

export type LayoutMode = "list" | "grid";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}
