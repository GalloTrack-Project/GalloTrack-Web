export default function WaveDecor({ variant }: { variant: 'left' | 'right' }) {
  if (variant === 'right') {
    return (
      <div
        aria-hidden="true"
        className="auth-wave-float pointer-events-none absolute -right-24 -bottom-16 h-64 w-[42rem] max-w-none"
      >
        <svg className="h-full w-full" viewBox="0 0 800 260" fill="none" preserveAspectRatio="none">
          <path
            d="M-40 188C120 138 242 150 366 184C498 220 638 218 840 166V284H-40V188Z"
            fill="var(--brand-orange)"
            opacity="0.28"
          />
          <path
            d="M-40 218C144 172 278 180 404 210C540 242 678 238 840 196V286H-40V218Z"
            fill="var(--brand-red)"
            opacity="0.55"
          />
          <path
            d="M-40 244C146 206 292 212 426 236C560 260 702 256 840 224V288H-40V244Z"
            fill="var(--sidebar-end)"
            opacity="0.85"
          />
          <path
            d="M-40 210C144 166 282 174 410 203C546 234 686 232 840 191"
            stroke="var(--brand-gold)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 overflow-hidden sm:h-44"
    >
      <svg
        className="text-sidebar-end/50 absolute inset-x-0 bottom-6 h-24 w-full"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0 142C168 128 320 136 480 144C650 153 834 151 1012 142C1108 137 1164 136 1200 139V160H0V142Z" />
        <path d="M750 132V94M750 105L724 88M750 110L778 91" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <circle cx="719" cy="82" r="20" />
        <circle cx="756" cy="87" r="17" />
        <path d="M855 134V94H945V134H855ZM884 134V111H918V134H884Z" />
        <path d="M846 98L900 70L954 98" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <path d="M992 135V106M1022 136V104M1052 137V105M1082 138V106" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M982 112H1096" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>

      <svg
        className="absolute inset-x-0 bottom-0 h-28 w-full sm:h-32"
        viewBox="0 0 1200 180"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 92C148 62 282 70 430 94C590 120 762 122 930 96C1032 81 1120 78 1200 88V180H0V92Z"
          fill="var(--brand-gold)"
          opacity="0.55"
        />
        <path
          d="M0 116C168 88 318 96 468 118C624 141 794 142 956 120C1062 105 1142 103 1200 108V180H0V116Z"
          fill="var(--brand-orange)"
          opacity="0.9"
        />
        <path
          d="M0 140C184 118 346 124 508 144C672 164 850 165 1018 146C1102 136 1162 136 1200 140V180H0V140Z"
          fill="var(--brand-red)"
        />
        <path
          d="M0 156C196 140 372 144 544 158C712 172 888 172 1048 160C1112 155 1162 155 1200 158V180H0V156Z"
          fill="var(--sidebar-end)"
        />
        <path
          d="M0 132C178 111 340 117 506 137C684 158 860 159 1022 141C1102 132 1162 132 1200 135"
          stroke="var(--brand-gold)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}
