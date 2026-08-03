## Memstack entrypoint

Use Memstack as a skill + memory library for this project.

### Where Memstack lives

- Vendored into this repo:
  - Skills: `memstack/skills`
  - Memory: `memstack/memory`

### How to use it in this project

- Treat `skills/` as reusable “how-to” playbooks and follow relevant ones when a task matches.
- Treat `memory/` as persistent project context; read it before making architecture decisions or large changes.

### Optional (recommended): vendor into this repo

If you want Memstack to travel with this repo (instead of referencing Desktop paths), copy it in:

- Create: `memstack/`
- Copy: `C:\Users\123\Desktop\memstack\skills` → `memstack/skills`
- Copy: `C:\Users\123\Desktop\memstack\memory` → `memstack/memory`

