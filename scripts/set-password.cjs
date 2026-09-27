// Computes the bcrypt hash and writes it into .env directly in Node, so the
// value never passes through a PowerShell string (which mangles the $ signs
// bcrypt hashes contain). Usage: node scripts/set-password.cjs 'your-password'
const fs = require('fs')
const bcrypt = require('bcryptjs')

const password = process.argv[2]
if (!password) {
  console.error("Usage: node scripts/set-password.cjs 'your-password'")
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)
let env = fs.readFileSync('.env', 'utf8')

if (env.match(/^ADMIN_PASSWORD_HASH=.*$/m)) {
  env = env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH="${hash}"`)
} else {
  env += `\nADMIN_PASSWORD_HASH="${hash}"\n`
}

fs.writeFileSync('.env', env)
console.log('Updated ADMIN_PASSWORD_HASH in .env (hash length:', hash.length, '- starts with $2:', hash.startsWith('$2'), ')')
