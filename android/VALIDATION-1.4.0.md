# Version 1.4.0 validation

- Main textbook indexes visually transcribed after Chinese OCR: HSK 4A PDF 141–150, HSK 4B PDF 151–160. Checked 602 rows / 601 distinct headwords; 93 additions close the exact-card coverage gaps.
- `npm test`: official 600-entry core comparison, all textbook rows have cards, unique IDs, 150/150/300/693 full-deck counts, new textbook MP3 playback, weak-word persistence, recall/listening separation, backup export, quiz reload and completion, and full-deck resume after 345 answers.
- `python android/verify-package.py`: APK archive integrity, exactly 1,293 entries and matching MP3s, unchanged original HSK 1–3 records, no personal progress or signing keys, and all audio clips decoded.
- APK signature verified; package ID unchanged; version code 8.
- Native emulator and physical-phone tests were not run for this version. English glosses and synthesized pronunciations have not received an exhaustive linguistic audit.
