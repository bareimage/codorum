import { Upload } from "lucide-react";

export function DropZone() {
  return (
    <div className="dz-overlay">
      <div className="dz-box">
        <div className="dz-icon"><Upload size={48} /></div>
        <div className="dz-text">Drop files here</div>
        <div className="dz-sub">Files and folders will be added to your workspace</div>
      </div>
    </div>
  );
}
