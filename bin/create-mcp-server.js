#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

// Get the directory where the source files are stored
const __filename = fileURLToPath(import.meta.url);
const rootDir = path.join(path.dirname(__filename), '..');
const sourceDir = path.join(rootDir, 'src');
const targetDir = process.cwd();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const promptUser = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Check if the target directory is empty
const isDirectoryEmpty = () => {
  const files = fs.readdirSync(targetDir);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
};

// Print a colorful message
const printColorMessage = (message, color) => {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Detect available package manager (prioritizing bun)
const detectPackageManager = () => {
  try {
    execSync('which bun', { stdio: 'ignore' });
    return 'bun';
  } catch (error) {
    // Bun not available, try npm
    try {
      execSync('which npm', { stdio: 'ignore' });
      return 'npm';
    } catch (error) {
      // If neither is available, we'll default to npm and let it fail if needed
      return 'npm';
    }
  }
};

// Install dependencies and build the project
const installAndBuild = () => {
  const packageManager = detectPackageManager();
  
  try {
    printColorMessage(`\n📦 Installing dependencies using ${packageManager}...`, 'blue');
    execSync(`${packageManager} install`, { stdio: 'inherit', cwd: targetDir });
    
    printColorMessage('\n🔨 Building project...', 'blue');
    execSync(`${packageManager} run build`, { stdio: 'inherit', cwd: targetDir });
    
    printColorMessage('\n✅ Dependencies installed and project built successfully!', 'green');
  } catch (error) {
    printColorMessage(`\n⚠️ Couldn't automatically install dependencies or build: ${error.message}`, 'yellow');
    printColorMessage('\nYou can install dependencies and build manually:', 'yellow');
    console.log(`  cd ${targetDir}`);
    console.log('  npm install');
    console.log('  npm run build');
  }
};

// Main function
async function main() {
  console.log('\n');
  printColorMessage('🚀 Creating a new MCP server project...', 'cyan');
  console.log('\n');

  // Check if the directory is empty
  if (!isDirectoryEmpty()) {
    printColorMessage('⚠️  The current directory is not empty!', 'yellow');
    console.log('To avoid overwriting existing files, please run this command in an empty directory.');
    console.log('You can create a new directory and run the command there:');
    console.log('\n  mkdir my-mcp-server && cd my-mcp-server && npx @mcpdotdirect/create-mcp-server\n');
    process.exit(1);
  }

  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    printColorMessage('⚠️  Source directory not found!', 'red');
    console.log('This is likely an issue with the package installation.');
    console.log('Please report this issue at: https://github.com/mcpdotdirect/create-mcp-server/issues');
    process.exit(1);
  }

  try {
    // Prompt for server name
    const defaultName = path.basename(targetDir);
    let serverName = await promptUser(`📝 Enter a name for your MCP server [${defaultName}]: `);
    
    // Use the default name if user just pressed Enter
    serverName = serverName.trim() || defaultName;
    
    // Copy source files to target directory
    copyFiles(sourceDir, path.join(targetDir, 'src'));
    
    // Copy other important files
    const filesToCopy = [
      '.gitignore',
      'tsconfig.json',
    ];
    
    for (const file of filesToCopy) {
      const srcPath = path.join(rootDir, file);
      const destPath = path.join(targetDir, file);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`📄 Created ${destPath}`);
      }
    }
    
    // Create a package.json for the new project
    createProjectPackageJson(serverName);
    
    // Create a custom README.md
    createCustomReadme(serverName);
    
    printColorMessage('✅ Source files copied successfully!', 'green');
    
    // Install dependencies and build the project
    installAndBuild();
    
    printColorMessage('\n🎉 MCP server project created successfully!', 'green');
    console.log('\nYou can now use the server in an MCP client with JSON like this:');
    console.log('  {');
    console.log(`    "${serverName}": {`);
    console.log('      "command": "npx",');
    console.log(`      "args": [`);
    console.log(`        "${process.cwd()}"`);
    console.log('      ]');
    console.log('    }');
    console.log('  }');
    console.log('\nOr with claude code you can add it with:');
    console.log(`  claude mcp add ${serverName} -- npx ${process.cwd()}`);
    console.log('\nHappy coding! 🚀\n');
    
    // Close readline interface
    rl.close();
  } catch (error) {
    printColorMessage(`\n❌ Error creating MCP server project: ${error.message}`, 'red');
    console.log('Please report this issue at: https://github.com/mcpdotdirect/create-mcp-server/issues');
    rl.close();
    process.exit(1);
  }
}

// Function to copy files recursively
function copyFiles(source, destination) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read all files/folders in the source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    // Skip node_modules, package-lock.json, .git, and other unnecessary directories/files
    // This ensures we don't copy any lock files or node_modules, letting the user generate their own
    if (entry.name === 'node_modules' || 
        entry.name === 'package-lock.json' ||
        entry.name === 'npm-debug.log' ||
        entry.name === 'yarn.lock' ||
        entry.name === 'pnpm-lock.yaml' ||
        entry.name === 'bun.lock' ||
        entry.name === '.git' || 
        entry.name === 'bin' || 
        entry.name === '.cursor' || 
        entry.name === 'LICENSE' ||
        entry.name === 'build') {
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively copy directories
      copyFiles(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
      console.log(`📄 Created ${destPath}`);
    }
  }
}

// Create a package.json for the new project
function createProjectPackageJson(serverName) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  
  const projectPackageJson = {
    name: serverName,
    module: "src/index.ts",
    type: "module",
    version: "1.0.0",
    description: `Model Context Protocol (MCP) Server - ${serverName}`,
    private: true,
    bin: {
      [serverName]: "build/index.js"
    },
    scripts: {
      "start": "node --loader ts-node/esm src/index.ts",
      "start:bun": "bun run src/index.ts",
      "build": "npm run build:bun || npm run build:tsc",
      "build:bun": "command -v bun >/dev/null && bun build src/index.ts --outdir build --target node || (echo 'Bun not found, using tsc' && npm run build:tsc)",
      "build:tsc": "tsc --project tsconfig.json && chmod +x build/index.js",
      "build:http": "npm run build:http:bun || npm run build:http:tsc",
      "build:http:bun": "command -v bun >/dev/null && bun build src/server/http-server.ts --outdir build --target node || (echo 'Bun not found, using tsc' && npm run build:http:tsc)",
      "build:http:tsc": "tsc --project tsconfig.json",
      "dev": "nodemon --exec ts-node --esm src/index.ts",
      "dev:bun": "bun --watch src/index.ts",
      "start:http": "node --loader ts-node/esm src/server/http-server.ts",
      "start:http:bun": "bun run src/server/http-server.ts",
      "dev:http": "nodemon --exec ts-node --esm src/server/http-server.ts",
      "dev:http:bun": "bun --watch src/server/http-server.ts",
      "prepare": "npm run build"
    },
    devDependencies: {
      "@types/bun": "latest",
      "@types/cors": "^2.8.17",
      "@types/node": "^20.11.0"
    },
    peerDependencies: {
      "typescript": "^5.8.2",
      "@valibot/to-json-schema": "^1.0.0",
      "effect": "^3.14.4"
    },
    dependencies: {
      "fastmcp": "^1.21.0",
      "cors": "^2.8.5",
      "zod": "^3.24.2"
    }
  };
  
  fs.writeFileSync(
    packageJsonPath, 
    JSON.stringify(projectPackageJson, null, 2)
  );
  console.log(`📄 Created ${packageJsonPath}`);
}

// Create a custom README.md for the new project
function createCustomReadme(serverName) {
  const readmePath = path.join(targetDir, 'README.md');
  
  const readmeContent = `# ${serverName}

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)

A custom MCP (Model Context Protocol) server built using FastMCP.

## 📖 Connecting to the Server

### Connecting from Cursor

To connect to your MCP server from Cursor:

1. Open Cursor Settings
2. Select "MCP" section
3. Click "Add new global MCP server"
4. Use the following JSON:

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": [
        "${process.cwd()}"
      ],
      "env": {
        "ENVIRONMENT_VARIABLE": "value"
      }
    },
    "${serverName}-http": {
      "url": "http://localhost:3001/sse"
    }
  }
}
\`\`\`

### Connecting from Claude Code

To connect to your MCP server from Claude Code:

run \`claude mcp add-json ${serverName} '{ "command": "npx", "args": [ "${process.cwd()}" ], "env": { "ENVIRONMENT_VARIABLE": "value" } }'\`

### Using mcp.json with Cursor

For a more portable configuration, create an \`.cursor/mcp.json\` file in your project's root directory.

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT     | HTTP server port | 3001 |
| HOST     | HTTP server host | 0.0.0.0 |

## 🛠️ Adding Custom Tools and Resources

When adding custom tools, resources, or prompts to your FastMCP server:

### Tools

\`\`\`typescript
server.addTool({
  name: "hello_world",
  description: "A simple hello world tool",
  parameters: z.object({
    name: z.string().describe("Name to greet")
  }),
  execute: async (params) => {
    return \`Hello, \${params.name}!\`;
  }
});
\`\`\`

### Resources

\`\`\`typescript
server.addResourceTemplate({
  uriTemplate: "example://{id}",
  name: "Example Resource",
  mimeType: "text/plain",
  arguments: [
    {
      name: "id",
      description: "Resource ID",
      required: true,
    },
  ],
  async load({ id }) {
    return {
      text: \`This is an example resource with ID: \${id}\`
    };
  }
});
\`\`\`

## 📚 Documentation

For more information about FastMCP, visit [FastMCP GitHub Repository](https://github.com/punkpeye/fastmcp).

For more information about the Model Context Protocol, visit the [MCP Documentation](https://modelcontextprotocol.io/introduction).

## 📄 License

This project is licensed under the MIT License.
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`📄 Created custom ${readmePath}`);
}

// Run the main function
main().catch(error => {
  printColorMessage(`\n❌ Unexpected error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
}); 