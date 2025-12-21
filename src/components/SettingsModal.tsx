import { useEffect, useMemo, useState } from "react";
import { open as open2 } from "@tauri-apps/plugin-dialog";
import {  invoke } from "@tauri-apps/api/core";

export type WheelConfig = {
  title: string;
  backgroundUrl: string;
  items: string[];
  spinDuration: number;
};

type SettingsModalProps = {
  open: boolean;
  initial: WheelConfig;
  onSave: (cfg: WheelConfig) => void;
  onClose: () => void;
};

export default function SettingsModal({ open, initial, onSave, onClose }: SettingsModalProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [bg, setBg] = useState(initial.backgroundUrl ?? "");
  const [text, setText] = useState(() => initial.items.join("\n"));

  const [spinDuration, setSpinDuration] = useState(initial.spinDuration ?? 2500);

  useEffect(() => {
    if (!open) return;
    setSpinDuration(initial.spinDuration ?? 2500);
    setTitle(initial.title ?? "");
    setBg(initial.backgroundUrl ?? "");
    setText(initial.items.join("\n"));
  }, [open, initial]);

  const parsedItems = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [text]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-title">配置</div>
        <div className="form-row">
          <label className="form-label">标题</label>
          <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="form-label">背景图片URL(如果文件太大，建议使用网络图片)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="text-input" value={bg} onChange={(e) => setBg(e.target.value)} placeholder="https://... 或选择本地文件" />
            <button className="pick-btn" onClick={async () => {
              const filepath = await open2({ multiple: false, filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }] });
              if (!filepath || Array.isArray(filepath)) return;
              // 调用 read_file_base64 命令读取文件内容
              const base64 = await invoke("read_file_base64", { path: filepath });
              console.log('base64,', base64);
              const url = `data:image/png;base64,${base64}`;
              console.log('url,', url);
              setBg(url);
            }}>选择本地图片</button>
          </div>
        </div>
        <div className="form-row">
          <label className="form-label">选项（每行一个）</label>
          <textarea className="text-area" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="form-label">旋转时间（毫秒）</label>
          <input className="text-input" type="number" value={spinDuration} onChange={(e) => setSpinDuration(Number(e.target.value))} />
        </div>
        <div className="modal-actions">
          <button onClick={() => onClose()}>取消</button>
          <button onClick={() => onSave({ title, backgroundUrl: bg, items: parsedItems, spinDuration })} disabled={parsedItems.length === 0}>保存</button>
        </div>
      </div>
    </div>
  );
}
