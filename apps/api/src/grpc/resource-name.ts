import { invalidArgument } from '../common/errors';

// AIP-122 resource name pattern helper, e.g. `new ResourceName('users/{user}', 'user')` or a
// nested pattern like `'articles/{article}/comments/{comment}'`. Growth story: a new resource
// gets one of these constructed with its pattern - no new parseXxx/xxxName function pair to hand-write.
export class ResourceName {
  private readonly regex: RegExp;

  constructor(
    private readonly pattern: string,
    private readonly label: string = pattern,
  ) {
    this.regex = new RegExp(
      `^${pattern.replace(/\{[a-zA-Z]+\}/g, '([^/]+)')}$`,
    );
  }

  format(...ids: string[]): string {
    let i = 0;
    return this.pattern.replace(/\{[a-zA-Z]+\}/g, () => ids[i++]);
  }

  tryParse(name: string): string[] | undefined {
    const m = this.regex.exec(name ?? '');
    return m ? m.slice(1) : undefined;
  }

  parse(name: string): string[] {
    const ids = this.tryParse(name);
    if (!ids)
      throw invalidArgument(`invalid ${this.label} resource name: "${name}"`);
    return ids;
  }

  parseOne(name: string): string {
    return this.parse(name)[0];
  }

  // For resources with a globally unique id but more than one possible full-name shape (e.g. a
  // comment nested under either an article or a user), pull just the trailing id segment.
  static lastSegment(name: string, segment: string, label = segment): string {
    const m = new RegExp(`/${segment}/([^/]+)$`).exec(name ?? '');
    if (!m) throw invalidArgument(`invalid ${label} resource name: "${name}"`);
    return m[1];
  }

  // Tries each candidate pattern in turn, e.g. a CreateCommentRequest.parent that's either
  // "articles/{article}" or "users/{user}". Adding a third parent kind is one more map entry.
  static matchOneOf<K extends string>(
    name: string,
    patterns: Record<K, ResourceName>,
    label = 'resource',
  ): { kind: K; ids: string[] } {
    for (const kind of Object.keys(patterns) as K[]) {
      const ids = patterns[kind].tryParse(name);
      if (ids) return { kind, ids };
    }
    throw invalidArgument(`invalid ${label}: "${name}"`);
  }
}
