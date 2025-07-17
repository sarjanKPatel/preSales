#!/usr/bin/env node

// Environment Check Script for PropelIQ
// Run with: node check-env.js

const fs = require("fs");
const path = require("path");

console.log("🔍 PropelIQ Environment Check");
console.log("============================");
console.log("");

// Colors for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check 1: .env.local file
log("1. Checking .env.local file...", "blue");
const envPath = path.join(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  log("✅ .env.local file exists", "green");

  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  const requiredVars = [
    "OPENAI_API_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const foundVars = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key] = trimmed.split("=");
      if (key) {
        foundVars.push(key);
      }
    }
  }

  for (const requiredVar of requiredVars) {
    if (foundVars.includes(requiredVar)) {
      log(`   ✅ ${requiredVar} is set`, "green");
    } else {
      log(`   ❌ ${requiredVar} is missing`, "red");
    }
  }
} else {
  log("❌ .env.local file not found", "red");
  log("   Create it in the project root with your API keys", "yellow");
}

console.log("");

// Check 2: Package.json dependencies
log("2. Checking package.json dependencies...", "blue");
const packagePath = path.join(process.cwd(), "package.json");

if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const requiredPackages = [
    "openai",
    "@supabase/supabase-js",
    "next",
    "react",
    "typescript",
  ];

  for (const pkg of requiredPackages) {
    if (dependencies[pkg]) {
      log(`   ✅ ${pkg} is installed`, "green");
    } else {
      log(`   ❌ ${pkg} is missing`, "red");
    }
  }
} else {
  log("❌ package.json not found", "red");
}

console.log("");

// Check 3: Node modules
log("3. Checking node_modules...", "blue");
const nodeModulesPath = path.join(process.cwd(), "node_modules");

if (fs.existsSync(nodeModulesPath)) {
  log("✅ node_modules directory exists", "green");

  // Check if key packages are actually installed
  const keyPackages = ["openai", "@supabase/supabase-js"];
  for (const pkg of keyPackages) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    if (fs.existsSync(pkgPath)) {
      log(`   ✅ ${pkg} is properly installed`, "green");
    } else {
      log(`   ❌ ${pkg} is missing from node_modules`, "red");
    }
  }
} else {
  log("❌ node_modules not found. Run: npm install", "red");
}

console.log("");

// Check 4: Next.js config
log("4. Checking Next.js configuration...", "blue");
const nextConfigPath = path.join(process.cwd(), "next.config.ts");

if (fs.existsSync(nextConfigPath)) {
  log("✅ next.config.ts exists", "green");
} else {
  log("❌ next.config.ts not found", "red");
}

console.log("");

// Check 5: TypeScript config
log("5. Checking TypeScript configuration...", "blue");
const tsConfigPath = path.join(process.cwd(), "tsconfig.json");

if (fs.existsSync(tsConfigPath)) {
  log("✅ tsconfig.json exists", "green");
} else {
  log("❌ tsconfig.json not found", "red");
}

console.log("");

// Summary and recommendations
log("📋 Summary & Recommendations:", "yellow");
console.log("");

log("To fix common issues:", "blue");
console.log("1. If .env.local is missing: Create it with your API keys");
console.log("2. If packages are missing: Run npm install");
console.log(
  "3. If server won't start: Check for syntax errors in config files"
);
console.log("4. If APIs fail: Verify OPENAI_API_KEY is valid");
console.log("");

log("Testing commands:", "blue");
console.log("• npm run dev (start development server)");
console.log("• bash test-apis.sh (run API tests)");
console.log("• Visit http://localhost:3000/test-apis (interactive testing)");
console.log("");

log("🎉 Environment check complete!", "green");
