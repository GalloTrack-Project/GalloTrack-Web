export default function FooterWave() {
  return (
    <div
      aria-hidden="true"
      data-testid="how-it-works-footer-wave"
      className="pointer-events-none relative mt-14 h-48 w-full overflow-hidden sm:mt-16 sm:h-60"
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-80 blur-[1px]"
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="how-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity="0.25" />
            <stop offset="55%" stopColor="var(--brand-orange)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--hero-end)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="how-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-orange)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <rect width="1440" height="260" fill="url(#how-sky)" />
        <circle cx="1135" cy="76" r="52" fill="var(--warning)" opacity="0.32" />
        <path
          d="M0 154C192 126 354 140 542 162C752 186 940 184 1142 160C1262 145 1360 143 1440 151V260H0V154Z"
          fill="url(#how-field)"
        />
        <path
          d="M0 190C226 166 410 176 604 194C822 214 1044 208 1244 188C1322 181 1388 180 1440 184V260H0V190Z"
          fill="var(--brand-orange)"
          opacity="0.2"
        />

        <g fill="var(--sidebar-end)" opacity="0.42">
          <path d="M142 178V125M142 138L108 116M142 146L176 120" stroke="var(--sidebar-end)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="104" cy="111" r="27" />
          <circle cx="125" cy="92" r="22" />
          <circle cx="177" cy="114" r="25" />
          <circle cx="158" cy="91" r="20" />

          <path d="M1228 184V125M1228 142L1198 116M1228 150L1262 122" stroke="var(--sidebar-end)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="1194" cy="111" r="28" />
          <circle cx="1216" cy="90" r="22" />
          <circle cx="1266" cy="114" r="25" />
          <circle cx="1248" cy="92" r="19" />

          <path d="M988 180H1120V222H988V180Z" />
          <path d="M972 182L1054 143L1136 182H972Z" />
          <path d="M1034 222V190H1072V222H1034Z" fill="var(--accent-soft)" opacity="0.75" />
          <path d="M1018 159H1034V175H1018V159ZM1082 159H1098V175H1082V159Z" fill="var(--accent-soft)" opacity="0.6" />

          <path d="M706 182V129M706 144L678 122M706 151L736 126" stroke="var(--sidebar-end)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="675" cy="117" r="23" />
          <circle cx="695" cy="100" r="18" />
          <circle cx="738" cy="121" r="22" />
        </g>

        <g stroke="var(--sidebar-end)" strokeWidth="4" strokeLinecap="round" opacity="0.3">
          <path d="M44 214V186M88 216V184M132 217V185M176 218V186M220 219V187M264 220V188M308 221V189M352 222V190" />
          <path d="M32 192H366M1180 198H1310" />
          <path d="M1188 204V180M1224 205V178M1260 206V179M1296 207V180" />
        </g>

        <path
          d="M0 226C216 210 400 216 588 230C788 244 1000 242 1198 228C1290 221 1374 219 1440 222V260H0V226Z"
          fill="var(--sidebar-end)"
          opacity="0.36"
        />
      </svg>

      <svg
        className="absolute inset-x-0 bottom-0 h-28 w-full sm:h-36"
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
      >
        <path
          d="M0 90C180 62 336 74 512 96C724 122 926 120 1140 94C1256 80 1360 77 1440 86V180H0V90Z"
          fill="var(--brand-orange)"
          opacity="0.62"
        />
        <path
          d="M0 116C214 92 386 102 576 122C790 144 1012 142 1210 120C1306 109 1382 107 1440 112V180H0V116Z"
          fill="var(--brand-red)"
          opacity="0.9"
        />
        <path
          d="M0 142C226 122 420 128 618 148C842 170 1066 170 1272 148C1348 140 1404 139 1440 142V180H0V142Z"
          fill="var(--sidebar-end)"
        />
      </svg>

      <div className="from-background absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent" />
    </div>
  );
}
