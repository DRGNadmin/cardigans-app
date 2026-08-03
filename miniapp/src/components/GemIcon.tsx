export function GemIcon({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M239.53,101.37l-46.19-61.6A16,16,0,0,0,180.53,32H75.47a16,16,0,0,0-12.81,6.4L16.47,101.37a16,16,0,0,0-.49,19.38L116,219.82a15.89,15.89,0,0,0,24.08,0l100-99.07A16,16,0,0,0,239.53,101.37ZM180.53,48l35.33,47.11L143.7,92.51ZM75.47,48h105.06l-41.2,50.14H116.67ZM40.14,95.11,75.47,48,112.3,92.51Zm87.89,112.36L34.12,108.4H103.5Zm46.47-5.59-33.32-84h54.8Z"
      />
    </svg>
  );
}
