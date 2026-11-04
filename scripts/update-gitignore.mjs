import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gitignorePath = resolve(__dirname, "..", ".gitignore");

const STANDARD_SECTIONS = `# ─── Dependencies ───
node_modules/
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# ─── Next.js Build & Outputs ───
.next/
out/
build/
dist/

# ─── Turbopack & Turborepo ───
.turbo/

# ─── Environment Files (keep .env.example) ───
.env
.env*.local
.env.development.local
.env.test.local
.env.production.local
*.env
!.env.example

# ─── Logs & Debugging ───
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# ─── Testing & Coverage ───
coverage/
*.lcov
.nyc_output/

# ─── TypeScript ───
*.tsbuildinfo

# ─── Sentry ───
.sentryclirc

# ─── Vercel ───
.vercel/

# ─── Operating System Files ───
.DS_Store
.AppleDouble
.LSOverride
._*
.Spotlight-V100
.Trashes
Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
ehthumbs_vista.db
*.stackdump
[Dd]esktop.ini
$RECYCLE.BIN/

# ─── IDE & Code Editors ───
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
*.code-workspace
.idea/
*.iws
*.iml
*.ipr
*.swp
*.swo
*.sublime-workspace
*.sublime-project

# ─── Temporary & Scratch Files ───
*.tmp
*.temp
scratch/
tmp/
`;

function updateGitignore() {
  console.log("Updating .gitignore...");
  
  let existingContent = "";
  if (existsSync(gitignorePath)) {
    existingContent = readFileSync(gitignorePath, "utf-8");
  }

  // Preserve any custom user-added lines marked in a CUSTOM section
  const customMarker = "# ─── Custom Project Rules ───";
  let customRules = "";
  if (existingContent.includes(customMarker)) {
    customRules = existingContent.slice(existingContent.indexOf(customMarker));
  } else {
    customRules = `${customMarker}\n# Add your custom rules below\n`;
  }

  const finalContent = `${STANDARD_SECTIONS.trim()}\n\n${customRules.trim()}\n`;
  writeFileSync(gitignorePath, finalContent, "utf-8");
  console.log("✓ .gitignore updated successfully!");
}

updateGitignore();

