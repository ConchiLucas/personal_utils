---
trigger: always_on
description: Auto-approved commands allowlist and execution guidelines for personal_utils workspace
---

# Command Execution Policy & Allowlist

The following commands are pre-approved and authorized for seamless automatic execution without requiring manual user confirmation:

- **Build & Development**: `go`, `npm`, `pnpm`, `node`, `git`, `server_bin`
- **Containers & Daemons**: `docker`, `brew`, `frpc`, `tailscale`, `pg_dump`
- **Network & Diagnostics**: `curl`, `ps`, `lsof`, `which`
- **File & Text Processing**: `cat`, `ls`, `grep`, `head`, `sed`, `awk`, `sort`, `mkdir`, `rm`, `python3`, `jq`
