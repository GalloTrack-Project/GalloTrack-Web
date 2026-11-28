export default function AboutRooster({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 560 760"
      className={className}
      preserveAspectRatio="xMidYMax meet"
    >
      <title>{label}</title>
      <defs>
        <linearGradient id="about-tail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="45%" stopColor="#115E59" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="about-tail-light" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="about-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="45%" stopColor="#C2410C" />
          <stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>
        <linearGradient id="about-hackle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="about-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C2D12" />
          <stop offset="55%" stopColor="#431407" />
          <stop offset="100%" stopColor="#1C1917" />
        </linearGradient>
        <linearGradient id="about-comb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="about-stump" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="55%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
        <filter id="about-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#431407" floodOpacity="0.28" />
        </filter>
      </defs>

      <ellipse cx="320" cy="690" rx="190" ry="30" fill="#431407" opacity="0.16" />

      <g filter="url(#about-shadow)">
        <path
          d="M330 410C392 324 432 222 506 92C486 196 478 280 438 364C420 402 394 435 360 462Z"
          fill="url(#about-tail)"
        />
        <path
          d="M344 394C392 322 432 230 486 138C462 230 448 302 416 374C402 407 378 434 348 454Z"
          fill="url(#about-tail-light)"
          opacity="0.9"
        />
        <path
          d="M356 410C390 358 420 296 446 224C430 294 418 348 396 394C384 420 366 442 344 458Z"
          fill="#0F172A"
          opacity="0.65"
        />
        <path
          d="M316 432C376 386 424 318 476 236"
          stroke="#5EEAD4"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.36"
          fill="none"
        />
        <path
          d="M330 420C380 368 420 302 452 238"
          stroke="#93C5FD"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.25"
          fill="none"
        />

        <path
          d="M292 294C350 306 390 352 398 418C406 488 376 552 316 590C268 620 210 607 178 566C144 522 154 456 192 404C224 360 255 320 292 294Z"
          fill="url(#about-body)"
        />
        <path
          d="M279 344C311 326 349 337 370 369C390 399 392 442 376 474C356 513 315 530 280 512C248 496 230 458 235 420C239 384 255 360 279 344Z"
          fill="url(#about-wing)"
        />
        <path
          d="M252 371C280 354 316 358 342 380M242 398C274 378 314 383 344 407M238 427C270 407 310 412 340 438M243 456C273 438 307 443 332 466"
          stroke="#F59E0B"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.45"
          fill="none"
        />

        <path
          d="M285 302C264 279 259 249 270 223C280 199 301 183 325 183C351 183 371 202 375 228C379 257 363 285 338 300Z"
          fill="url(#about-body)"
        />
        <path
          d="M276 232C269 213 281 198 296 195C309 192 320 199 325 210C337 191 359 191 369 207C378 220 372 238 357 248C341 258 312 254 296 247C287 243 279 238 276 232Z"
          fill="url(#about-hackle)"
        />
        <path
          d="M282 269C286 251 304 239 325 239C349 239 366 254 368 276C370 300 355 320 332 326C308 332 283 317 279 294Z"
          fill="#C2410C"
        />

        <path
          d="M313 151C307 132 319 120 332 128C336 111 352 106 362 117C371 103 389 108 391 124C407 120 417 133 410 148C403 162 384 166 369 158C360 171 339 171 330 158C321 165 308 160 313 151Z"
          fill="url(#about-comb)"
        />
        <path
          d="M303 188C280 183 254 197 240 216C230 230 235 245 252 247L304 236Z"
          fill="#F59E0B"
        />
        <path
          d="M248 221L204 232L250 243Z"
          fill="#FCD34D"
        />
        <path
          d="M285 253C279 270 283 286 297 295C310 303 326 299 333 285C338 273 333 261 322 253Z"
          fill="url(#about-comb)"
        />
        <circle cx="340" cy="196" r="9" fill="#FEF3C7" />
        <circle cx="342" cy="197" r="4" fill="#111827" />
        <circle cx="341" cy="196" r="1.4" fill="#FFFFFF" />

        <path
          d="M258 290C243 313 241 340 254 360M270 295C259 317 260 339 272 355"
          stroke="#FDE68A"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.9"
          fill="none"
        />
        <path
          d="M292 584L278 660M344 582L352 660"
          stroke="#D97706"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path d="M278 660L246 681M278 660L276 689M278 660L306 680" stroke="#B45309" strokeWidth="8" strokeLinecap="round" />
        <path d="M352 660L324 681M352 660L354 690M352 660L382 680" stroke="#B45309" strokeWidth="8" strokeLinecap="round" />

        <path
          d="M178 700C184 681 224 668 294 668H456C480 668 496 682 496 700V742H178V700Z"
          fill="url(#about-stump)"
        />
        <ellipse cx="337" cy="692" rx="158" ry="30" fill="#A16207" opacity="0.75" />
        <path
          d="M214 714C256 723 300 725 344 720M238 739C280 746 328 746 372 740M382 704C408 709 430 714 446 721"
          stroke="#D97706"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.5"
          fill="none"
        />
        <path
          d="M410 672C430 650 458 648 470 668C480 684 462 698 438 699C416 700 400 690 410 672Z"
          fill="#78350F"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}
