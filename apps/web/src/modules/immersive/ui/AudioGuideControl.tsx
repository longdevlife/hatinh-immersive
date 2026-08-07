export type AudioGuideStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioGuideControlProps {
  status: AudioGuideStatus;
  currentTime: number;
  duration: number;
  onPlay(): void;
  onPause(): void;
  onSeek(seconds: number): void;
}

export function AudioGuideControl({
  status,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
}: AudioGuideControlProps) {
  const isPlaying = status === 'playing';
  const formattedTime = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;

  return (
    <div className="audio-guide" aria-label="Hướng dẫn âm thanh">
      <button
        className="immersive-icon-button audio-guide__toggle"
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        aria-label={isPlaying ? 'Tạm dừng hướng dẫn âm thanh' : 'Phát hướng dẫn âm thanh'}
      >
        {isPlaying ? 'Ⅱ' : '▶'}
      </button>
      <div className="audio-guide__details">
        <strong>Thuyết minh</strong>
        <span>{status === 'loading' ? 'Đang chuẩn bị...' : formattedTime}</span>
      </div>
      <input
        className="audio-guide__seek"
        type="range"
        min="0"
        max={Math.max(duration, 1)}
        value={Math.min(currentTime, Math.max(duration, 1))}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Tua hướng dẫn âm thanh"
      />
    </div>
  );
}
