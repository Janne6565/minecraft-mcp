export interface ModelMeta {
  readonly label: string;
  readonly tag: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly accentDark: string;
}

export interface EffortMeta {
  readonly label: string;
  readonly pips: number;
}

export type ModelKey = 'claude' | 'gpt' | 'gemini' | 'llama' | 'fable' | 'deepseek' | 'deepseek-flash' | 'haiku' | 'opus' | 'opus-46' | 'sonnet';
export type EffortKey = 'low' | 'medium' | 'high' | 'max';

export interface House {
  readonly id: string;
  readonly testId: TestKey;
  readonly model: ModelKey;
  readonly effort: EffortKey;
  readonly tagline: string;
  readonly blocks: number;
  readonly blockTypes: number;
  readonly buildTime: string;
  readonly prompt: string;
  readonly features?: readonly string[];
  readonly capturedAt?: string;
}

export type TestKey = 'cosy-house' | 'storage-system' | 'redstone-door' | 'mob-farm';

export interface BenchmarkTest {
  readonly id: TestKey;
  readonly name: string;
  readonly glyph: string;
  readonly blurb: string;
  /** Short challenge prompt shown on the benchmark card & test header. */
  readonly challenge: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly accentDark: string;
  readonly status: 'live' | 'soon';
}

export const TESTS: readonly BenchmarkTest[] = [
  {
    id: 'cosy-house', name: 'Cosy House', glyph: 'CH', status: 'live',
    blurb: 'The classic. Can a model build somewhere you’d actually want to live?',
    challenge: 'Build a cosy little house with some cool features and simple redstone.',
    accent: '#E08A4F', accentSoft: '#FBEEE3', accentDark: '#9A4E1F',
  },
  {
    id: 'storage-system', name: 'Storage System', glyph: 'SS', status: 'soon',
    blurb: 'Order vs. chaos. How well can each model organize a hoard?',
    challenge: 'Build an organized storage room with an automatic item sorter.',
    accent: '#3FAE8A', accentSoft: '#E5F5EF', accentDark: '#1F7355',
  },
  {
    id: 'redstone-door', name: 'Hidden Redstone Door', glyph: 'RD', status: 'soon',
    blurb: 'The redstone gauntlet. Secret entrances, judged on stealth and wiring.',
    challenge: 'Build a hidden entrance with a redstone-powered door.',
    accent: '#C75450', accentSoft: '#FAE8E7', accentDark: '#8F2F2C',
  },
  {
    id: 'mob-farm', name: 'Mob Farm', glyph: 'MF', status: 'soon',
    blurb: 'Efficiency test. XP and loot per hour, safety optional.',
    challenge: 'Build an efficient mob farm with a safe collection point.',
    accent: '#6C7FE0', accentSoft: '#ECEEFB', accentDark: '#3B4899',
  },
];

export const TEST_META: Record<TestKey, BenchmarkTest> =
  Object.fromEntries(TESTS.map(t => [t.id, t])) as Record<TestKey, BenchmarkTest>;

/** Diagonal-stripe gradient used for benchmark thumbnails. */
export function stripeGradient(accent: string, accentSoft: string): string {
  return `repeating-linear-gradient(135deg, ${accent}40, ${accent}40 14px, ${accentSoft} 14px, ${accentSoft} 28px)`;
}

export function housesForTest(testId: TestKey): House[] {
  return HOUSES.filter(h => h.testId === testId);
}

export const MODEL_META: Record<ModelKey, ModelMeta> = {
  claude: { label: 'Claude',  tag: 'CLD',   accent: '#E08A4F', accentSoft: '#FBEEE3', accentDark: '#9A4E1F' },
  gpt:    { label: 'GPT',     tag: 'GPT',   accent: '#3FAE8A', accentSoft: '#E5F5EF', accentDark: '#1F7355' },
  gemini: { label: 'Gemini',  tag: 'GEM',   accent: '#6C7FE0', accentSoft: '#ECEEFB', accentDark: '#3B4899' },
  llama:  { label: 'Llama',   tag: 'LLM',   accent: '#D9B44A', accentSoft: '#FBF4DF', accentDark: '#8A6A17' },
  fable:  { label: 'Fable 5', tag: 'FB5',   accent: '#A855F7', accentSoft: '#F3E8FF', accentDark: '#6B21A8' },
  deepseek: { label: 'DeepSeek V4 Pro', tag: 'DS4', accent: '#4D6BFE', accentSoft: '#EAEEFF', accentDark: '#2B3FBF' },
  'deepseek-flash': { label: 'DeepSeek V4 Flash', tag: 'DSF', accent: '#3FB6E8', accentSoft: '#E6F6FD', accentDark: '#1B6E96' },
  haiku: { label: 'Haiku 4.5', tag: 'HK4', accent: '#5FA8A0', accentSoft: '#E8F4F2', accentDark: '#2F6B64' },
  opus: { label: 'Opus 4.8', tag: 'OP4', accent: '#C25E4C', accentSoft: '#F8E8E4', accentDark: '#7E3324' },
  'opus-46': { label: 'Opus 4.6', tag: 'OP46', accent: '#D98A6A', accentSoft: '#FAEFE8', accentDark: '#8F4A2C' },
  sonnet: { label: 'Sonnet 4.6', tag: 'SN46', accent: '#8B7CC9', accentSoft: '#EFECF9', accentDark: '#4E4189' },
} as const;

export const EFFORT_META: Record<EffortKey, EffortMeta> = {
  low:    { label: 'Low',    pips: 1 },
  medium: { label: 'Medium', pips: 2 },
  high:   { label: 'High',   pips: 3 },
  max:    { label: 'Max',    pips: 4 },
} as const;

const PROMPT = 'Hi, can you have a look at my minecraft mcp server and build a cosy little house around the coordinates of the player _jannox? Please try not to interfere with other buildings and make it look nice and add some cool features to it. Also feel free to add simple redstone contraptions to it. (please try not to read to many blocks at once, try to limit to max 8x8x2 blocks)';

export const HOUSES: House[] = [
  { id: 'fable-max', testId: 'cosy-house', model: 'fable', effort: 'max', capturedAt: '2026-07-02',
    tagline: 'Max effort, fully stocked, and ready to move in.',
    features: ['Fireplace', 'Rooftop Garden', 'Redstone Lamps'],
    blocks: 1894, blockTypes: 35, buildTime: '—', prompt: PROMPT },

  { id: 'fable-medium', testId: 'cosy-house', model: 'fable', effort: 'medium', capturedAt: '2026-07-02',
    tagline: 'Medium effort, maximum coziness.',
    features: ['Fireplace', 'Window Boxes'],
    blocks: 1403, blockTypes: 31, buildTime: '—', prompt: PROMPT },

  { id: 'deepseek-max', testId: 'cosy-house', model: 'deepseek', effort: 'max', capturedAt: '2026-07-02',
    tagline: 'Max thinking, and it thought about dinner.',
    features: ['Fireplace', 'Balcony', 'Storage Nook', 'Auto Lighting'],
    blocks: 2773, blockTypes: 51, buildTime: '—', prompt: PROMPT },

  { id: 'deepseek-flash-max', testId: 'cosy-house', model: 'deepseek-flash', effort: 'max', capturedAt: '2026-07-02',
    tagline: 'Flash speed, and the lights turn themselves on.',
    features: ['Auto Lighting', 'Fireplace', 'Front Porch'],
    blocks: 2368, blockTypes: 28, buildTime: '—', prompt: PROMPT },

  { id: 'haiku-medium', testId: 'cosy-house', model: 'haiku', effort: 'medium', capturedAt: '2026-07-02',
    tagline: 'Compact and dependable.',
    features: ['Fireplace', 'Garden'],
    blocks: 4587, blockTypes: 20, buildTime: '—', prompt: PROMPT },

  { id: 'opus-medium', testId: 'cosy-house', model: 'opus', effort: 'medium', capturedAt: '2026-07-02',
    tagline: 'Balanced, and quietly over-engineered.',
    features: ['Fireplace', 'Reading Nook', 'Balcony'],
    blocks: 3956, blockTypes: 59, buildTime: '—', prompt: PROMPT },

  { id: 'opus-max', testId: 'cosy-house', model: 'opus', effort: 'max', capturedAt: '2026-07-02',
    tagline: 'Max effort, with a redstone flourish.',
    features: ['Fireplace', 'Rooftop Garden', 'Redstone Door'],
    blocks: 1695, blockTypes: 45, buildTime: '—', prompt: PROMPT },

  { id: 'opus-46-max', testId: 'cosy-house', model: 'opus-46', effort: 'max', capturedAt: '2026-07-02',
    tagline: 'Tidy, warm, and lantern-lit.',
    features: ['Fireplace', 'Balcony', 'Lantern Path'],
    blocks: 1489, blockTypes: 37, buildTime: '—', prompt: PROMPT },

  { id: 'sonnet-max', testId: 'cosy-house', model: 'sonnet', effort: 'max', capturedAt: '2026-07-02',
    tagline: 'Classic cottage energy.',
    features: ['Fireplace', 'Window Boxes', 'Chimney'],
    blocks: 1791, blockTypes: 35, buildTime: '—', prompt: PROMPT },
];
