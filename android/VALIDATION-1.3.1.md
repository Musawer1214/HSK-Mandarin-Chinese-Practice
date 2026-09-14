# Version 1.3.1 validation

- `npm test`: official HSK 4 headword membership, 150/150/300/600 unique full-deck entries, recall and listening level filters, actual offline audio, saved weak words, backup export, listening score isolation, quiz reload, completion, and mobile overflow checks.
- HSK 4 full-deck persistence checked after 45 and 345 answers; all 600 cards completed.
- `python android/verify-package.py`: signed release archive integrity, exactly 1,200 entries and matching MP3s, unchanged HSK 1–3 content/IDs, no personal state or signing keys, and all audio durations/decoding.
- Android signing verification passes with the existing signing key, package ID com.musaw.hskrecall, version code 7.
- Native emulator/physical-device checks were not run for 1.3.1. Prior release native tests do not constitute a native test of this version.
- Headword verification does not certify every English definition or synthesized pronunciation.
