import type {Config} from '@docusaurus/types';
import type {Options, ThemeConfig} from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));

const config: Config = {
  title: 'Sovereign Agentic Architecture',
  tagline: 'Local agency. Deterministic governance. Deliberate disclosure.',
  favicon: 'img/favicon.svg',
  url: 'https://CharlieAtki06.github.io',
  baseUrl: '/SovereignAgenticArchitecture/',
  organizationName: 'CharlieAtki06',
  projectName: 'SovereignAgenticArchitecture',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
      onBrokenMarkdownImages: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          editUrl: 'https://github.com/CharlieAtki06/SovereignAgenticArchitecture/edit/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Options,
    ],
  ],
  plugins: [
    function resolveOptionalMermaidElkImport() {
      return {
        name: 'resolve-optional-mermaid-elk-import',
        configureWebpack() {
          return {
            resolve: {
              // Docusaurus' Mermaid theme contains a statically discoverable
              // dynamic import for its optional ELK peer. Webpack resolves it
              // even when the runtime feature flag is false. The small state
              // diagrams here use Mermaid's normal layout, so provide a local
              // no-op target and avoid an unnecessary heavy dependency.
              alias: {
                '@mermaid-js/layout-elk': path.resolve(
                  siteDirectory,
                  'src/shims/mermaid-layout-elk.ts',
                ),
              },
            },
          };
        },
      };
    },
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'contracts',
        path: '../contracts',
        routeBasePath: 'contracts',
        sidebarPath: './sidebars.contracts.ts',
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'project',
        // Root files are staged into a non-overlapping content directory.
        // Pointing a docs plugin at `..` causes its MDX loader to overlap the
        // main docs and contracts loaders, compiling every document twice.
        path: './project-docs',
        routeBasePath: 'project',
        sidebarPath: './sidebars.project.ts',
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ],
  ],
  themeConfig: {
    image: 'img/social-card.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Sovereign Architecture',
      logo: {
        alt: 'Three connected zones',
        src: 'img/mark.svg',
      },
      items: [
        {to: '/atlas', label: 'Atlas', position: 'left'},
        {to: '/demo', label: 'Demo', position: 'left'},
        {type: 'docSidebar', sidebarId: 'engineering', label: 'Engineering reference', position: 'left'},
        {
          type: 'docSidebar',
          sidebarId: 'projectFiles',
          docsPluginId: 'project',
          label: 'Project files',
          position: 'left',
        },
        {to: '/code-graphs', label: 'Code graphs', position: 'left'},
        {to: '/contracts/connector-design', label: 'Contracts', position: 'left'},
        {
          href: 'https://github.com/CharlieAtki06/SovereignAgenticArchitecture',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Understand',
          items: [
            {label: 'System map', to: '/docs/system-map'},
            {label: 'One governed request', to: '/docs/flows/governed-request'},
            {label: 'Glossary', to: '/docs/glossary'},
          ],
        },
        {
          title: 'Verify',
          items: [
            {label: 'Boundary contract', to: '/docs/data-boundary-and-projection-contract'},
            {label: 'ADRs', to: '/docs/adr/'},
            {label: 'Evidence model', to: '/docs/reference/evidence-and-maturity'},
          ],
        },
      ],
      copyright: `Sovereign Agentic Architecture · documentation build ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'python', 'rust'],
    },
  } satisfies ThemeConfig,
};

export default config;
