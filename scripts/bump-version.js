#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { cwd } from 'process'

const pkgPath = join(cwd(), 'package.json')

if (!existsSync(pkgPath)) {
  console.error('Error: package.json not found at', pkgPath)
  process.exit(1)
}

const part = process.argv[2] || 'patch'

try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const oldVer = pkg.version || '1.0.0'
  const parts = oldVer.split('.')

  // Normalize to semver (major.minor.patch)
  let major = parseInt(parts[0], 10) || 1
  let minor = parseInt(parts[1], 10) || 0
  let patch = parseInt(parts[2], 10) || 0

  switch (part) {
    case 'major':
      major += 1
      minor = 0
      patch = 0
      break
    case 'minor':
      minor += 1
      patch = 0
      break
    case 'patch':
    default:
      patch += 1
      break
  }

  const newVersion = `${major}.${minor}.${patch}`
  pkg.version = newVersion
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`✓ Bumped version: ${oldVer} -> ${newVersion} (${part})`)

  // Keep package-lock.json in sync so `npm ci` (deploy) never sees drift.
  const lockPath = join(cwd(), 'package-lock.json')
  if (existsSync(lockPath)) {
    try {
      const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
      const rootPkg = lock.packages && lock.packages['']
      const needsUpdate = lock.version !== newVersion || (rootPkg && rootPkg.version !== newVersion)
      if (needsUpdate) {
        lock.version = newVersion
        if (rootPkg) rootPkg.version = newVersion
        writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n')
        console.log(`✓ Synchronized package-lock.json to ${newVersion}`)
      }
    } catch (lockErr) {
      console.warn('⚠ No se pudo sincronizar package-lock.json:', lockErr.message)
    }
  }
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
