import { describe, expect, it } from 'vitest';
import { feedbackMailto } from '../feedback';

function parse(link: string) {
  const [address, query] = link.replace(/^mailto:/, '').split('?');
  const params = new URLSearchParams(query);
  return { address, subject: params.get('subject'), body: params.get('body') };
}

describe('feedbackMailto', () => {
  it('addresses the email and labels its subject by kind', () => {
    const mail = parse(feedbackMailto('kidrota@t80.dev', 'idea', 'Add a dark icon', '0.1.0'));
    expect(mail.address).toBe('kidrota@t80.dev');
    expect(mail.subject).toBe('KidRota Suggestion');
    expect(parse(feedbackMailto('a@b.c', 'problem', 'x', '1')).subject).toBe('KidRota Problem');
  });

  it('carries the message and app version in the body', () => {
    const mail = parse(feedbackMailto('a@b.c', 'other', '  Line one\nLine two  ', '0.1.0'));
    expect(mail.body).toBe('Line one\nLine two\n\n—\nKidRota 0.1.0');
  });

  it('escapes characters that would otherwise break the link', () => {
    const link = feedbackMailto('a@b.c', 'idea', 'Tom & Jerry? 50% off #1 + more', '1');
    const rawBody = link.split('&body=')[1];
    expect(rawBody).not.toMatch(/[ &#?+\n]/);
    expect(parse(link).body?.startsWith('Tom & Jerry? 50% off #1 + more')).toBe(true);
  });
});
