# herdr-status

A Command Code mod that tells your terminal what the agent is doing, using
[OSC 7501 — the Program Status Protocol](https://mitchellh.com/writing/program-status-osc7501).
Instead of scraping the screen, Command Code reports `working`, `blocked`,
`done`, `idle`, and `error` over the pty, so agent inboxes like
[Herdr](https://herdr.dev/), terminals like Ghostty, and anything else that
speaks the protocol can show the real state.

## What it reports

| Situation | Report |
|---|---|
| Session starts | `idle` |
| A run starts | `working` |
| A permission prompt is shown | `blocked` (`kind=permission`, prompt description in `msg`) |
| The question tool is waiting for an answer | `blocked` (`kind=question`) |
| The question is answered | `working` |
| A run ends | `done` |
| A run is interrupted (Esc) | `idle` |
| A run fails | `error` |

Every record carries `app=command-code`, so the terminal can name the program
and pick the right icon.

## Install

```sh
cmd mods add ~/Data/Projects/herdr-status
```

or drop `index.ts` into `~/.commandcode/mods/` (for example
`cp index.ts ~/.commandcode/mods/herdr-status.ts`). Mods load at process
start; existing sessions pick it up with `/reload`.

## Requirements

- Command Code with the mod API (`cmd mods`, `--mod`).
- A terminal that understands OSC 7501. Others ignore the sequence, so the
  mod is harmless everywhere.

## How it works

The mod opens `/dev/tty` once and writes the escape sequence
`ESC ] 7501 ; state=…:app=command-code ESC \`, falling back to `process.stdout`
when there is no controlling terminal. Reports are deduplicated, so an
unchanged state is never sent twice.

## License

MIT
