import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadEnvironment, parseConfig } from '../src/config.js';
import { createPool } from '../src/db/pool.js';
import { WorkspaceService } from '../src/workspaces/service.js';
import { ComposerService } from '../src/composer/service.js';
import { emptyDocument } from '../src/composer/schema.js';
import { blockLibrary, newBlock } from '../src/composer/library.js';

loadEnvironment();
const config = parseConfig(process.env);
if (config.NODE_ENV !== 'development')
  throw new Error('Local development only.');
const fixture = JSON.parse(await readFile('.local/demo-accounts.json', 'utf8'));
const workspace = new URL(fixture.url).pathname.split('/').at(-1)!;
const pool = createPool(config.DATABASE_URL);
try {
  const actor = (
    await pool.query('SELECT id FROM users WHERE email=$1', [
      fixture.accounts.find((entry: { role: string }) => entry.role === 'owner')
        .email,
    ])
  ).rows[0].id;
  const title = 'Open studio · Composer review';
  const existing = await pool.query(
    'SELECT id FROM campaigns WHERE workspace_id=$1 AND title=$2 AND deleted_at IS NULL',
    [workspace, title],
  );
  let campaign = existing.rows[0]?.id;
  if (!campaign) {
    campaign = await new WorkspaceService(pool).createCampaign(
      actor,
      workspace,
      title,
    );
    const document = emptyDocument();
    document.blocks = blockLibrary.map((entry) =>
      newBlock(entry.type, randomUUID()),
    );
    for (const block of document.blocks) {
      switch (block.type) {
        case 'brand':
          block.data = {
            name: 'Studio North',
            tagline: 'Good things happen together.',
            logo: true,
          };
          break;
        case 'hero':
          block.data = {
            eyebrow: 'AN OPEN INVITATION · BERLIN',
            headline: 'A little curiosity. A whole new perspective.',
            description:
              'Step inside our studio for an afternoon of ideas, conversations and hands-on making. Come as you are. Leave inspired.',
            visual: 'image',
            ratio: 'landscape',
            alt: 'A sunlit studio, ready for a day of making',
          };
          break;
        case 'media':
          block.data = {
            heading: 'A glimpse inside',
            items: [
              {
                kind: 'image',
                ratio: 'square',
                alt: 'Materials and sketches on a workbench',
                caption: 'Room to experiment.',
              },
              {
                kind: 'video',
                ratio: 'landscape',
                alt: 'A short welcome from the studio team',
                caption: 'Meet the makers.',
              },
            ],
          };
          break;
        case 'information':
          block.data = {
            heading: 'Make space for something new.',
            body: 'We believe the best ideas start with a conversation. Join our team for a relaxed afternoon behind the scenes.\n\n**No experience needed. Just bring your curiosity.**\n\n- Meet independent designers\n- Try a small creative workshop\n- Share a coffee and a fresh perspective',
          };
          break;
        case 'benefits':
          block.data = {
            heading: 'An afternoon well spent.',
            items: [
              {
                title: 'Try something',
                description:
                  'A short, guided workshop to get your ideas moving.',
              },
              {
                title: 'Find your people',
                description: 'Meet a welcoming community of curious makers.',
              },
              {
                title: 'Take it home',
                description:
                  'Leave with something you made and a story to share.',
              },
            ],
          };
          break;
        case 'event':
          block.data = {
            heading: 'Save an afternoon.',
            startsAt: '2026-10-17T13:00',
            endsAt: '2026-10-17T18:00',
            timezone: 'Europe/Berlin',
            venue: 'Studio North · Demo venue',
            address: 'Example courtyard 12\nBerlin · Fictional review address',
            mapUrl: 'https://example.com/directions',
          };
          break;
        case 'offer':
          block.data = {
            heading: 'A warm welcome, on us.',
            price: 'Free entry',
            description: 'Coffee, conversation and one mini workshop included.',
            code: '',
            terms:
              'Fictional event for local product review. No real booking or offer.',
          };
          break;
        case 'testimonials':
          block.data = {
            heading: 'Good company. Fresh ideas.',
            items: [
              {
                quote:
                  'I came for a look around and left with a notebook full of ideas.',
                author: 'Alex · Example guest',
                source: 'Illustrative testimonial, not a real review',
              },
            ],
          };
          break;
        case 'cta':
          block.data = {
            heading: 'See you at the studio?',
            description: 'Make a little room for inspiration.',
            label: 'Save my spot',
            url: 'https://example.com/register',
          };
          break;
        case 'actions':
          block.data = {
            heading: 'Keep in touch.',
            items: [
              {
                kind: 'email',
                label: 'Ask us a question',
                url: 'mailto:hello@example.test',
              },
              {
                kind: 'website',
                label: 'Explore the studio',
                url: 'https://example.com',
              },
            ],
          };
          break;
        case 'contact':
          block.data = {
            name: 'Studio North',
            email: 'hello@example.test',
            phone: '+49 30 000000',
            address: 'Berlin, Germany · Fictional business',
            website: 'https://example.com',
          };
          break;
        case 'footer':
          block.data = {
            identity:
              'Studio North · A fictional advertiser for CometRow review',
            legalLinks: [
              { label: 'Legal notice', url: 'https://example.com/legal' },
              { label: 'Privacy', url: 'https://example.com/privacy' },
            ],
            note: 'Made with care. Previewed with CometRow.',
          };
          break;
      }
    }
    await new ComposerService(pool).save(actor, workspace, campaign, {
      document,
      revision: 1,
      mutationId: randomUUID(),
    });
  }
  console.log(
    `${config.APP_ORIGIN}/w/${workspace}/campaigns/${campaign}/compose`,
  );
  console.log(
    'Existing review content is preserved. Use Duplicate from the overview for experiments.',
  );
} finally {
  await pool.end();
}
