export default function HeroDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg
        className="text-hero-end/20 dark:text-hero-end/25 absolute -left-28 top-8 hidden h-[34rem] w-80 sm:block"
        viewBox="0 0 320 620"
        fill="none"
      >
        <path
          d="M-18 96C82 138 100 236 38 334C-24 432-6 530 86 574"
          stroke="currentColor"
          strokeWidth="64"
          strokeLinecap="round"
        />
        <path
          d="M-42 212C62 244 92 314 44 388C-4 462 12 536 102 592"
          stroke="currentColor"
          strokeWidth="24"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M-8 30C98 70 132 162 88 252"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>

      <svg
        className="text-brand-red/10 dark:text-brand-red/10 absolute top-24 left-[30%] hidden h-[26rem] w-[26rem] lg:block"
        viewBox="0 0 420 420"
        fill="none"
      >
        <path
          d="M316 42C224 48 145 103 103 190C75 248 70 310 84 362C129 342 174 311 213 270C280 201 321 122 316 42Z"
          fill="currentColor"
        />
        <path
          d="M306 80C265 130 222 186 173 241C143 274 112 303 79 326"
          stroke="var(--background)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M168 206C204 215 238 210 268 190"
          stroke="var(--background)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M214 151C246 160 275 156 301 140"
          stroke="var(--background)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M122 266C157 272 186 264 207 246"
          stroke="var(--background)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>

      <svg
        className="text-brand-red/10 dark:text-brand-red/10 absolute top-52 right-[42%] hidden h-72 w-72 xl:block"
        viewBox="0 0 360 360"
        fill="none"
      >
        <path
          d="M264 30C183 41 112 92 80 166C58 216 58 268 72 312C111 292 149 265 182 229C239 167 271 100 264 30Z"
          fill="currentColor"
        />
        <path
          d="M249 61C216 105 179 151 138 197C113 225 88 249 61 268"
          stroke="var(--background)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>

      <svg
        className="text-brand-orange/30 dark:text-brand-orange/15 absolute inset-x-0 bottom-0 hidden h-28 w-full sm:block md:h-36"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 182C144 158 264 174 374 188C506 205 624 208 760 192C920 173 1054 166 1194 184C1290 196 1368 201 1440 192V220H0V182Z"
          fill="currentColor"
        />
        <path
          d="M70 182V150M126 181V147M182 180V144M238 178V142M1296 188V151M1352 191V154M1408 193V156"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M58 156H250M1284 157H1420"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M1030 182V120L1084 88L1140 120V182H1030ZM1092 182V146H1124V182H1092Z"
          fill="currentColor"
        />
        <path
          d="M1020 122L1084 80L1148 122"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M400 184C400 160 420 142 446 142C472 142 492 160 492 184H400Z"
          fill="currentColor"
        />
        <path
          d="M444 146V108M444 118L416 102M444 114L472 96"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M1180 184C1180 152 1200 126 1226 126C1252 126 1272 152 1272 184H1180Z"
          fill="currentColor"
        />
        <path
          d="M1226 132V84M1226 104L1194 82M1226 96L1258 72"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
